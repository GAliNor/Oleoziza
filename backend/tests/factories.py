from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import get_settings
from core.helpers import get_local_today
from core.security import get_signing_key
from modules.auth.business.auth_secrets import hash_secret
from modules.auth.business.auth_tokens import build_access_token
from modules.auth.models.auth_models import Credential
from modules.auth.types.auth_types import CredentialKind
from modules.client.models.client_models import Client
from modules.client.types.client_types import ClientKind
from modules.configuration.models.configuration_models import OliveVariety
from modules.lot.models.lot_models import Lot
from modules.lot.types.lot_types import LotMode, NotificationChoice
from modules.site.models.site_models import Season, Site
from modules.site.types.site_types import SeasonStatus
from modules.territory.models.territory_models import Province
from modules.territory.types.territory_types import ProvinceKind
from modules.user.models.user_models import SiteAssignment, SiteAssignmentPermission, User, UserLoginMethod
from modules.user.types.user_types import LoginMethod, Permission, Role, UserStatus


TEST_PROVINCE_ID = "oujda-angad"

TEST_VARIETY_ID = "haouzia"


def create_site(db: Session, code: str = "TS") -> Site:
    """
    Add a Site in the Oriental, adding its Province when the reference seed has not run.

    Args:
        db (Session): Test session.
        code (str): Two-letter Site code.

    Returns:
        Site: The saved Site.
    """
    if db.get(Province, TEST_PROVINCE_ID) is None:
        db.add(Province(id=TEST_PROVINCE_ID, name="Oujda-Angad", kind=ProvinceKind.PREFECTURE))
        db.flush()
    site = Site(code=code, name=f"Huilerie {code}", province_id=TEST_PROVINCE_ID, city="Oujda", address="Test")
    db.add(site)
    db.flush()
    return site


def get_open_season(db: Session) -> Season:
    """
    Return the open Season, opening one when none is.

    Args:
        db (Session): Test session.

    Returns:
        Season: The open Season.
    """
    season = db.scalar(select(Season).where(Season.status == SeasonStatus.OPEN))
    if season is None:
        season = Season(code="9999", label="Saison test", starts_on=date(2026, 11, 1))
        db.add(season)
        db.flush()
    return season


def create_staff_user(
    db: Session,
    phone: str,
    role: Role = Role.MANAGEMENT,
    permissions_by_site: dict[UUID, list[Permission]] | None = None,
    is_owner: bool = False,
    password: str | None = None,
    email: str | None = None,
) -> User:
    """
    Add an active staff User with Site Assignments, and a password when given.

    Args:
        db (Session): Test session.
        phone (str): Unique phone in E.164.
        role (Role): Role of the User.
        permissions_by_site (dict[UUID, list[Permission]] | None): Permissions per Site.
        is_owner (bool): Owner flag.
        password (str | None): Password to store, with the email_password Login Method.
        email (str | None): Email, needed with a password.

    Returns:
        User: The saved User.
    """
    user = User(role=role, first_name="Test", last_name=phone[-4:], phone=phone, email=email, status=UserStatus.ACTIVE, is_owner=is_owner)
    db.add(user)
    db.flush()
    if password is not None:
        db.add(UserLoginMethod(user_id=user.id, method=LoginMethod.EMAIL_PASSWORD))
        db.add(Credential(user_id=user.id, kind=CredentialKind.PASSWORD, hash=hash_secret(password)))
    for site_id, permissions in (permissions_by_site or {}).items():
        assignment = SiteAssignment(user_id=user.id, site_id=site_id)
        db.add(assignment)
        db.flush()
        for permission in permissions:
            db.add(SiteAssignmentPermission(site_assignment_id=assignment.id, permission=permission))
    db.flush()
    return user


def build_auth_header(user: User, permissions_by_site: dict[UUID, list[Permission]] | None = None) -> dict[str, str]:
    """
    Sign an access token for a User and wrap it in an Authorization header.

    Args:
        user (User): Signed-in User.
        permissions_by_site (dict[UUID, list[Permission]] | None): Permissions the token carries.

    Returns:
        dict[str, str]: Bearer header.
    """
    claims_sites = {str(site_id): [permission.value for permission in permissions] for site_id, permissions in (permissions_by_site or {}).items()}
    token = build_access_token(user, claims_sites, get_signing_key(), get_settings().AUTH_ACCESS_TOKEN_EXPIRY_IN_SECONDS)
    return {"Authorization": f"Bearer {token}"}


def create_lot(db: Session, site: Site, press_line_id: UUID) -> Lot:
    """
    Add a waiting Service Milling Lot of a new Client on a Site, adding the olive variety when the reference seed has not run.

    Args:
        db (Session): Test session.
        site (Site): Site receiving the Lot.
        press_line_id (UUID): Press Line it is planned on.

    Returns:
        Lot: The saved Lot.
    """
    if db.get(OliveVariety, TEST_VARIETY_ID) is None:
        db.add(OliveVariety(id=TEST_VARIETY_ID, name="Haouzia", is_active=True))
    now = datetime.now(timezone.utc)
    client = Client(kind=ClientKind.INDIVIDUAL, first_name="Test", last_name="Client", phone="+212669990900", province_id=TEST_PROVINCE_ID, city="Oujda", address="Test", first_site_id=site.id, entered_at=now)
    db.add(client)
    db.flush()
    lot = Lot(
        site_id=site.id,
        season_id=get_open_season(db).id,
        client_id=client.id,
        mode=LotMode.SERVICE_MILLING,
        olive_variety_id=TEST_VARIETY_ID,
        net_weight_in_kg=Decimal("1000"),
        suggested_milling_rate_per_kg=Decimal("0.50"),
        milling_rate_per_kg=Decimal("0.50"),
        notification_choice=NotificationChoice.NONE,
        press_line_id=press_line_id,
        planned_start_at=now,
        entered_at=now,
    )
    db.add(lot)
    db.flush()
    return lot


def open_fresh_season(db: Session, code: str = "9898") -> Season:
    """
    Close any Season under way and open one spanning today, so date rules can be tested whatever the real calendar says.

    Args:
        db (Session): Test session.
        code (str): Four-digit code of the test Season.

    Returns:
        Season: The new open Season, from ten days ago to sixty days ahead.
    """
    for season in db.scalars(select(Season).where(Season.status.in_((SeasonStatus.OPEN, SeasonStatus.PLANNED)))):
        season.status = SeasonStatus.CLOSED
    db.flush()
    today = get_local_today()
    season = Season(code=code, label="Saison test", starts_on=today - timedelta(days=10), ends_on=today + timedelta(days=60), status=SeasonStatus.OPEN)
    db.add(season)
    db.flush()
    return season
