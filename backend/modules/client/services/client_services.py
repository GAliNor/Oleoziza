import re
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.client.business.client_figures import get_follow_up, list_lot_lines
from modules.finance.business.client_credit import get_open_credits
from modules.finance.business.lot_fees import get_amounts_due
from modules.finance.models.finance_models import CreditNote, Payment, PaymentAllocation
from modules.finance.types.finance_types import PaymentStatus
from modules.client.models.client_models import Client
from modules.client.types.client_types import (
    ClientAccountLineOut,
    ClientAccountOut,
    ClientContactIn,
    ClientCreateIn,
    ClientKind,
    ClientLotLineOut,
    ClientOut,
    ClientRecordOut,
    ClientSiteFiguresOut,
)
from modules.lot.models.lot_models import Lot
from modules.site.business.season_lookup import get_open_season
from modules.site.models.site_models import Site
from modules.territory.models.territory_models import Province
from modules.user.types.user_types import Permission


CLIENT_CREATED_ACTION = "client.created"

CLIENT_CONTACT_CHANGED_ACTION = "client.contact_changed"

NATIONAL_ID_PATTERN = re.compile(r"^[A-Z]{1,2}\d{1,7}$")

COMPANY_IDENTIFIER_PATTERN = re.compile(r"^\d{15}$")


class ClientService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the User reading or changing Clients.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user

    def list_clients(self) -> list[ClientOut]:
        """
        List every active Client, shared by all Sites, with the Sites each came to; light enough for the Operator's picker.

        Returns:
            list[ClientOut]: The Clients, newest first.
        """
        clients = self.db.scalars(select(Client).where(Client.merged_into_id.is_(None)).order_by(Client.created_at.desc())).all()
        site_ids_by_client = self._list_site_ids_by_client()
        credits = get_open_credits(self.db)
        return [map_client(client, site_ids_by_client.get(client.id, []), credits.get(client.id, Decimal(0))) for client in clients]

    def list_records(self) -> list[ClientRecordOut]:
        """
        List every Client for Management's register, with their Lots read in one query and their figures per Site.

        Returns:
            list[ClientRecordOut]: The register.

        Raises:
            RefusedError: clients_forbidden without client.view on any Site.
        """
        self._require_any(Permission.CLIENT_VIEW)
        clients = self.db.scalars(select(Client).where(Client.merged_into_id.is_(None)).order_by(Client.created_at.desc())).all()
        lines_by_client = list_lot_lines(self.db)
        site_names = {site_id: name for site_id, name in self.db.execute(select(Site.id, Site.name))}
        open_season = get_open_season(self.db)
        balances = self._list_balances()
        return [self._build_record(client, lines_by_client.get(client.id, []), site_names, open_season.code if open_season else None, balances.get(client.id, {})) for client in clients]

    def get_account(self, client_id: UUID) -> ClientAccountOut:
        """
        Read what a Client holds and owes now, with the Lots of the open Season.

        Args:
            client_id (UUID): Client to read.

        Returns:
            ClientAccountOut: The account.

        Raises:
            RefusedError: client_not_found.
        """
        self._get_client(client_id)
        open_season = get_open_season(self.db)
        lines = list_lot_lines(self.db, [client_id]).get(client_id, [])
        season_lines = [line for line in lines if open_season and line.season == open_season.code]
        lots = list(self.db.scalars(select(Lot).where(Lot.client_id == client_id)))
        due = sum(get_amounts_due(self.db, lots).values(), Decimal(0))
        pending = self.db.scalar(select(func.coalesce(func.sum(PaymentAllocation.amount), 0)).join(Payment, Payment.id == PaymentAllocation.payment_id).where(Payment.client_id == client_id, Payment.status == PaymentStatus.PENDING))
        return ClientAccountOut(oil_stock_litres=0, due_dh=float(due), pending_dh=float(pending), payout_dh=0, history=[ClientAccountLineOut(code=line.code, status=line.status, kg=line.kg) for line in season_lines])

    def list_history(self, client_id: UUID, site_id: UUID) -> list[ClientLotLineOut]:
        """
        List a Client's past Lots on one Site, across Seasons.

        Args:
            client_id (UUID): Client to read.
            site_id (UUID): Site of the Lots.

        Returns:
            list[ClientLotLineOut]: The Lots, newest first.

        Raises:
            RefusedError: client_not_found.
        """
        self._get_client(client_id)
        return list_lot_lines(self.db, [client_id], site_id).get(client_id, [])

    def create_client(self, payload: ClientCreateIn) -> ClientOut:
        """
        Add a Client, online or replayed from the outbox; a replay of an id already saved answers that Client.

        Args:
            payload (ClientCreateIn): The Client as typed.

        Returns:
            ClientOut: The Client as saved.

        Raises:
            RefusedError: clients_forbidden without client.create or reception.create on the Site, names_required, identifier_invalid, province_not_found.
        """
        existing = self.db.get(Client, payload.id)
        if existing is not None:
            return map_client(existing, [existing.first_site_id])
        if not (self.current_user.has_permission(payload.site_id, Permission.CLIENT_CREATE) or self.current_user.has_permission(payload.site_id, Permission.RECEPTION_CREATE)):
            raise RefusedError("clients_forbidden", 403)
        identifier = self._validate_identity(payload)
        if self.db.get(Province, payload.location.province) is None:
            raise RefusedError("province_not_found", 422)
        client = Client(
            id=payload.id,
            kind=payload.kind,
            title=payload.title if payload.kind == ClientKind.INDIVIDUAL else None,
            first_name=clean(payload.first_name) if payload.kind == ClientKind.INDIVIDUAL else None,
            last_name=clean(payload.last_name) if payload.kind == ClientKind.INDIVIDUAL else None,
            legal_name=clean(payload.legal_name) if payload.kind == ClientKind.COMPANY else None,
            national_id_number=identifier if payload.kind == ClientKind.INDIVIDUAL else None,
            company_identifier=identifier if payload.kind == ClientKind.COMPANY else None,
            phone=payload.phone,
            email=clean(payload.email),
            province_id=payload.location.province,
            city=payload.location.city.strip(),
            address=payload.location.address.strip(),
            first_site_id=payload.site_id,
            entered_at=payload.entered_at or datetime.now(timezone.utc),
            was_recorded_offline=payload.recorded_offline,
            device_label=payload.device_label,
            created_by_id=self.current_user.id,
        )
        self.db.add(client)
        self.db.flush()
        record_audit_event(self.db, self.current_user.id, CLIENT_CREATED_ACTION, site_id=payload.site_id, entity_type="client", entity_id=client.id, after={"name": client.display_name, "phone": client.phone})
        self.db.commit()
        return map_client(client, [payload.site_id])

    def update_contact(self, client_id: UUID, payload: ClientContactIn) -> ClientOut:
        """
        Change a Client's phone or email; the change is audited.

        Args:
            client_id (UUID): Client to change.
            payload (ClientContactIn): New phone and/or email.

        Returns:
            ClientOut: The Client as saved.

        Raises:
            RefusedError: client_not_found, clients_forbidden without client.edit on any Site.
        """
        self._require_any(Permission.CLIENT_EDIT)
        client = self._get_client(client_id)
        before = {"phone": client.phone, "email": client.email}
        if payload.phone is not None:
            client.phone = payload.phone
        if payload.email is not None:
            client.email = clean(payload.email)
        client.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, CLIENT_CONTACT_CHANGED_ACTION, site_id=client.first_site_id, entity_type="client", entity_id=client.id, before=before, after={"phone": client.phone, "email": client.email})
        self.db.commit()
        return map_client(client, self._list_site_ids_by_client([client.id]).get(client.id, [client.first_site_id]))

    def _list_balances(self) -> dict[UUID, dict[UUID, Decimal]]:
        """
        Compute what every Client owes per Site: what their Lots still owe, minus the credit their Credit Notes still hold there.

        Returns:
            dict[UUID, dict[UUID, Decimal]]: Balance per Client and Site (negative when the mill owes them credit).
        """
        lots = list(self.db.scalars(select(Lot)))
        dues = get_amounts_due(self.db, lots)
        balances: dict[UUID, dict[UUID, Decimal]] = {}
        for lot in lots:
            per_site = balances.setdefault(lot.client_id, {})
            per_site[lot.site_id] = per_site.get(lot.site_id, Decimal(0)) + dues[lot.id]
        for site_id in self.db.scalars(select(CreditNote.site_id).distinct()):
            for client_id, credit in get_open_credits(self.db, site_id=site_id).items():
                per_site = balances.setdefault(client_id, {})
                per_site[site_id] = per_site.get(site_id, Decimal(0)) - credit
        return balances

    def _build_record(self, client: Client, lines: list[ClientLotLineOut], site_names: dict[UUID, str], open_season_code: str | None, balances: dict[UUID, Decimal]) -> ClientRecordOut:
        """
        Shape one Client for the register; Oil Stock reads zero until Storages are summed per Client.

        Args:
            client (Client): Client row.
            lines (list[ClientLotLineOut]): Their Lots.
            site_names (dict[UUID, str]): Name of every Site.
            open_season_code (str | None): Code of the Season under way.
            balances (dict[UUID, Decimal]): What they owe per Site.

        Returns:
            ClientRecordOut: The register row.
        """
        site_ids = list(dict.fromkeys([client.first_site_id, *(line.site_id for line in lines), *balances]))
        sites = [ClientSiteFiguresOut(site_id=site_id, site_name=site_names.get(site_id, ""), oil_stock_litres=0, balance=float(balances.get(site_id, Decimal(0)))) for site_id in site_ids]
        balance = float(sum(balances.values(), Decimal(0)))
        return ClientRecordOut(
            id=client.id,
            name=client.display_name,
            kind=client.kind,
            follow_up=get_follow_up(lines, open_season_code, balance),
            phone=client.phone,
            identifier=client.national_id_number or client.company_identifier or "",
            region=client.city,
            province=client.province_id,
            address=client.address,
            email=client.email,
            oil_stock_litres=0,
            balance=balance,
            sites=sites,
            history=lines,
        )

    def _list_site_ids_by_client(self, client_ids: list[UUID] | None = None) -> dict[UUID, list[UUID]]:
        """
        Read in one query the Sites each Client came to: where they were created and where they brought Lots.

        Args:
            client_ids (list[UUID] | None): Clients to read, every Client when None.

        Returns:
            dict[UUID, list[UUID]]: Site ids per Client.
        """
        created = select(Client.id, Client.first_site_id)
        brought = select(Lot.client_id, Lot.site_id).distinct()
        if client_ids is not None:
            created = created.where(Client.id.in_(client_ids))
            brought = brought.where(Lot.client_id.in_(client_ids))
        site_ids: dict[UUID, list[UUID]] = {}
        for client_id, site_id in [*self.db.execute(created), *self.db.execute(brought)]:
            if site_id not in site_ids.setdefault(client_id, []):
                site_ids[client_id].append(site_id)
        return site_ids

    def _validate_identity(self, payload: ClientCreateIn) -> str | None:
        """
        Check the names a kind needs and the CIN or ICE format; another Client with the same number only warns in the front.

        Args:
            payload (ClientCreateIn): The Client as typed.

        Returns:
            str | None: The identifier, upper-cased and trimmed.

        Raises:
            RefusedError: names_required, identifier_invalid.
        """
        if payload.kind == ClientKind.INDIVIDUAL and not (clean(payload.first_name) and clean(payload.last_name)):
            raise RefusedError("names_required", 422)
        if payload.kind == ClientKind.COMPANY and not clean(payload.legal_name):
            raise RefusedError("names_required", 422)
        identifier = clean(payload.identifier.upper()) if payload.identifier else None
        pattern = NATIONAL_ID_PATTERN if payload.kind == ClientKind.INDIVIDUAL else COMPANY_IDENTIFIER_PATTERN
        if identifier and not pattern.match(identifier):
            raise RefusedError("identifier_invalid", 422)
        return identifier

    def _require_any(self, permission: Permission) -> None:
        """
        Refuse a User who holds a Permission on no Site.

        Args:
            permission (Permission): Permission needed.

        Raises:
            RefusedError: clients_forbidden.
        """
        if not self.current_user.is_owner and not any(permission.value in permissions for permissions in self.current_user.permissions_by_site.values()):
            raise RefusedError("clients_forbidden", 403)

    def _get_client(self, client_id: UUID) -> Client:
        """
        Load a Client or refuse an unknown id.

        Args:
            client_id (UUID): Client id.

        Returns:
            Client: The Client.

        Raises:
            RefusedError: client_not_found.
        """
        client = self.db.get(Client, client_id)
        if client is None:
            raise RefusedError("client_not_found", 404)
        return client


def clean(value: str | None) -> str | None:
    """
    Trim a typed value, turning a blank one into None.

    Args:
        value (str | None): Typed value.

    Returns:
        str | None: The trimmed value, or None.
    """
    return value.strip() or None if value else None


def map_client(client: Client, site_ids: list[UUID], credit: Decimal = Decimal(0)) -> ClientOut:
    """
    Shape a Client for the pickers and the search.

    Args:
        client (Client): Client row.
        site_ids (list[UUID]): Sites the Client came to.
        credit (Decimal): What their Credit Notes still hold.

    Returns:
        ClientOut: The Client as the front reads it.
    """
    return ClientOut(
        id=client.id,
        kind=client.kind,
        name=client.display_name,
        title=client.title,
        first_name=client.first_name,
        last_name=client.last_name,
        legal_name=client.legal_name,
        phone=client.phone,
        email=client.email,
        identifier=client.national_id_number or client.company_identifier,
        credit_dh=float(credit),
        site_ids=site_ids,
    )


def get_client_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> ClientService:
    """
    Build the client service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        ClientService: Service bound to the session and actor.
    """
    return ClientService(db, current_user)
