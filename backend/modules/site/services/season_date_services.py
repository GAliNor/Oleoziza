from datetime import date
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import get_local_midnight, get_local_today
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.configuration.models.configuration_models import SiteSetting
from modules.expense.models.expense_models import Expense
from modules.expense.types.expense_types import ExpensePaymentState
from modules.site.business.season_lookup import get_season_of_day
from modules.site.models.site_models import Season
from modules.site.services.season_services import SeasonService
from modules.site.types.site_types import SeasonDatesIn, SeasonOut, SeasonStatus


SEASON_DATES_SET_ACTION = "season.dates_set"


class SeasonDateService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session and the User moving a Season's first or last day.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client, for the Season banners.
        """
        self.db = db
        self.current_user = current_user
        self.seasons = SeasonService(db, current_user, storage)

    def set_dates(self, season_id: UUID, dates: SeasonDatesIn) -> SeasonOut:
        """
        Move the first or last day of a prepared or open Season; its code, its name and its Lots stay. Its first prices and the Expenses paid around its first day follow.

        Args:
            season_id (UUID): Season moved.
            dates (SeasonDatesIn): Its first and last day.

        Returns:
            SeasonOut: The Season with its new dates.

        Raises:
            RefusedError: season_forbidden, season_not_found, season_closed, season_dates_reversed, season_starts_in_future, season_dates_overlap.
        """
        self.seasons.check_can_manage()
        season = self.seasons.get_season_row(season_id)
        self._check_dates(season, dates)
        previous_start = season.starts_on
        before = {"startsOn": season.starts_on.isoformat(), "endsOn": season.ends_on.isoformat() if season.ends_on else None}
        after = {"startsOn": dates.starts_on.isoformat(), "endsOn": dates.ends_on.isoformat()}
        if before == after:
            return self.seasons.build_season(season)
        season.starts_on = dates.starts_on
        season.ends_on = dates.ends_on
        season.updated_by_id = self.current_user.id
        self.db.flush()
        if dates.starts_on != previous_start:
            self._move_first_prices(season, previous_start)
            self._replace_expenses(season, previous_start)
        record_audit_event(self.db, self.current_user.id, SEASON_DATES_SET_ACTION, entity_type="season", entity_id=season.id, before=before, after=after)
        self.db.commit()
        return self.seasons.build_season(season)

    def _check_dates(self, season: Season, dates: SeasonDatesIn) -> None:
        """
        Refuse dates that cross another Season, leave an open Season without a start, or touch a closed one.

        Args:
            season (Season): Season moved.
            dates (SeasonDatesIn): Its new dates.

        Raises:
            RefusedError: season_closed, season_dates_reversed, season_starts_in_future, season_dates_overlap.
        """
        if season.status == SeasonStatus.CLOSED:
            raise RefusedError("season_closed")
        if dates.ends_on < dates.starts_on:
            raise RefusedError("season_dates_reversed", 422)
        if season.status == SeasonStatus.OPEN and dates.starts_on != season.starts_on and dates.starts_on > get_local_today():
            raise RefusedError("season_starts_in_future", 422)
        for other in self.db.scalars(select(Season).where(Season.id != season.id)):
            is_before = (other.starts_on, other.created_at) < (season.starts_on, season.created_at)
            if is_before and dates.starts_on <= max(other.starts_on, other.ends_on or other.starts_on):
                raise RefusedError("season_dates_overlap")
            if not is_before and dates.ends_on >= other.starts_on:
                raise RefusedError("season_dates_overlap")

    def _move_first_prices(self, season: Season, previous_start: date) -> None:
        """
        Keep the prices of the first day in force from the new first day; an open Season that starts later keeps them, since they are in force already.

        Args:
            season (Season): Season moved.
            previous_start (date): Its first day before.
        """
        if season.status == SeasonStatus.OPEN and season.starts_on > previous_start:
            return
        first_prices = (SiteSetting.season_id == season.id, SiteSetting.effective_from <= get_local_midnight(previous_start))
        self.db.execute(update(SiteSetting).where(*first_prices).values(effective_from=get_local_midnight(season.starts_on)))

    def _replace_expenses(self, season: Season, previous_start: date) -> None:
        """
        Count the Expenses paid between the old and the new first day in the Season those days now belong to, as the totals of each period do.

        Args:
            season (Season): Season moved, open or prepared.
            previous_start (date): Its first day before.
        """
        if season.status != SeasonStatus.OPEN:
            return
        first, last = sorted((previous_start, season.starts_on))
        for expense in self.db.scalars(select(Expense).where(Expense.payment_state == ExpensePaymentState.PAID, Expense.date >= first, Expense.date < last)):
            counted_in = get_season_of_day(self.db, expense.date)
            if counted_in is not None:
                expense.season_id = counted_in.id


def get_season_date_service(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    storage: RustFSClient = Depends(get_rustfs_client),
) -> SeasonDateService:
    """
    Build the season date service for one request.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        SeasonDateService: Service bound to the session and actor.
    """
    return SeasonDateService(db, current_user, storage)
