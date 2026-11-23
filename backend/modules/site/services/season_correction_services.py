from uuid import UUID

from fastapi import Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.configuration.models.configuration_models import SiteSetting
from modules.expense.models.expense_models import Expense
from modules.lot.models.lot_models import Lot
from modules.site.business.season_lookup import get_open_season, list_started_seasons
from modules.site.models.site_models import CodeSequence, Season
from modules.site.services.season_services import SeasonService
from modules.site.types.site_types import CodeKind, SeasonOut, SeasonStatus


SEASON_REOPENED_ACTION = "season.reopened"

SEASON_DELETED_ACTION = "season.deleted"

MONEY_CODE_KINDS = (CodeKind.PAYMENT, CodeKind.REFUND, CodeKind.WITHDRAWAL, CodeKind.PAYOUT)


class SeasonCorrectionService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session and the Owner taking back a Season's closing or creation.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client, for the Season banners.
        """
        self.db = db
        self.current_user = current_user
        self.seasons = SeasonService(db, current_user, storage)

    def reopen_season(self, season_id: UUID) -> SeasonOut:
        """
        Open the latest closed Season again, with its Lots and prices as they were; a Season prepared after it stays prepared.

        Args:
            season_id (UUID): Closed Season.

        Returns:
            SeasonOut: The Season, open.

        Raises:
            RefusedError: owner_only, season_not_found, season_not_closed, season_already_open, season_not_latest.
        """
        self._check_owner()
        season = self.seasons.get_season_row(season_id)
        if season.status != SeasonStatus.CLOSED:
            raise RefusedError("season_not_closed")
        if get_open_season(self.db) is not None:
            raise RefusedError("season_already_open")
        if list_started_seasons(self.db)[0].id != season.id:
            raise RefusedError("season_not_latest")
        before = {"closedAt": season.closed_at.isoformat() if season.closed_at else None}
        season.status = SeasonStatus.OPEN
        season.closed_at = None
        season.closed_by_id = None
        season.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, SEASON_REOPENED_ACTION, entity_type="season", entity_id=season.id, before=before, after={"code": season.code})
        self.db.commit()
        return self.seasons.build_season(season)

    def delete_season(self, season_id: UUID) -> None:
        """
        Delete a Season nothing was recorded in, with its prices.

        Args:
            season_id (UUID): Season, prepared, open or closed.

        Raises:
            RefusedError: owner_only, season_not_found, season_has_lots, season_has_expenses, season_has_payments.
        """
        self._check_owner()
        season = self.seasons.get_season_row(season_id)
        self._check_empty(season)
        self.db.execute(delete(SiteSetting).where(SiteSetting.season_id == season.id))
        self.db.execute(delete(CodeSequence).where(CodeSequence.season_id == season.id))
        record_audit_event(self.db, self.current_user.id, SEASON_DELETED_ACTION, entity_type="season", entity_id=season.id, before={"code": season.code, "status": season.status.value})
        self.db.delete(season)
        self.db.commit()

    def _check_empty(self, season: Season) -> None:
        """
        Refuse a Season holding a Lot or an Expense, or whose Payment, Refund or Withdrawal codes were given out.

        Args:
            season (Season): Season to delete.

        Raises:
            RefusedError: season_has_lots, season_has_expenses, season_has_payments.
        """
        if self.db.scalar(select(Lot.id).where(Lot.season_id == season.id).limit(1)):
            raise RefusedError("season_has_lots")
        if self.db.scalar(select(Expense.id).where(Expense.season_id == season.id).limit(1)):
            raise RefusedError("season_has_expenses")
        money_codes = select(CodeSequence.id).where(CodeSequence.season_id == season.id, CodeSequence.kind.in_(MONEY_CODE_KINDS), CodeSequence.last_number > 0)
        if self.db.scalar(money_codes.limit(1)):
            raise RefusedError("season_has_payments")

    def _check_owner(self) -> None:
        """
        Refuse anyone but an Owner.

        Raises:
            RefusedError: owner_only.
        """
        if not self.current_user.is_owner:
            raise RefusedError("owner_only", 403)


def get_season_correction_service(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    storage: RustFSClient = Depends(get_rustfs_client),
) -> SeasonCorrectionService:
    """
    Build the season correction service for one request.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        SeasonCorrectionService: Service bound to the session and actor.
    """
    return SeasonCorrectionService(db, current_user, storage)
