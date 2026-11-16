from datetime import date
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.journal_feed import build_day_feed
from modules.audit.types.audit_types import ActivityGroup, ActivityKind, JournalDaySummaryOut, JournalEventOut
from modules.site.business.site_scope import resolve_site_ids
from modules.user.types.user_types import Permission


class JournalService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the User reading the Journal.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user

    def get_day_summary(self, site_id: UUID, day: date) -> JournalDaySummaryOut:
        """
        Sum up a day on a Site over the events the caller may see.

        Args:
            site_id (UUID): Site.
            day (date): Day in Morocco.

        Returns:
            JournalDaySummaryOut: Figures, group counts and people.
        """
        events = self._visible_events(site_id, day)
        receptions = [event for event in events if event.kind == ActivityKind.RECEPTION]
        return JournalDaySummaryOut(
            receptions=len(receptions),
            received_kg=sum(event.kg or 0 for event in receptions),
            stored_litres=sum(event.litres or 0 for event in events if event.kind == ActivityKind.STORED),
            discounts=sum(1 for event in events if event.kind in (ActivityKind.DISCOUNT_GIVEN, ActivityKind.DISCOUNT_PENDING)),
            discount_dh=sum(event.amount or 0 for event in events if event.kind in (ActivityKind.DISCOUNT_GIVEN, ActivityKind.DISCOUNT_APPROVED)),
            collected_dh=sum(event.amount or 0 for event in events if event.kind == ActivityKind.PAYMENT_CONFIRMED),
            total=len(events),
            group_counts={group: sum(1 for event in events if event.group == group) for group in ActivityGroup},
            people=sorted({event.by for event in events if event.by}),
        )

    def page_day(self, site_id: UUID, day: date, group: ActivityGroup | None, person: str | None, offset: int, limit: int) -> tuple[list[JournalEventOut], int]:
        """
        Read one page of a day's events, newest first, filtered by group and person.

        Args:
            site_id (UUID): Site.
            day (date): Day in Morocco.
            group (ActivityGroup | None): Group kept.
            person (str | None): Name kept.
            offset (int): First row.
            limit (int): Rows per page.

        Returns:
            tuple[list[JournalEventOut], int]: The page and the filtered list's size.
        """
        events = [event for event in self._visible_events(site_id, day) if (group is None or event.group == group) and (not person or event.by == person)]
        return events[offset : offset + limit], len(events)

    def _visible_events(self, site_id: UUID, day: date) -> list[JournalEventOut]:
        """
        The day's events, money ones only for those who see the finances on the Site.

        Args:
            site_id (UUID): Site.
            day (date): Day in Morocco.

        Returns:
            list[JournalEventOut]: Events the caller may see.

        Raises:
            RefusedError: journal_forbidden without audit_trail.view or dashboard.view on the Site.
        """
        resolve_site_ids(self.db, self.current_user, [site_id])
        if not (self.current_user.has_permission(site_id, Permission.AUDIT_TRAIL_VIEW) or self.current_user.has_permission(site_id, Permission.DASHBOARD_VIEW)):
            raise RefusedError("journal_forbidden", 403)
        sees_money = self.current_user.has_permission(site_id, Permission.FINANCE_VIEW)
        return [event for event in build_day_feed(self.db, site_id, day) if sees_money or not event.is_money]


def get_journal_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> JournalService:
    """
    Build the journal service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        JournalService: Service bound to the session and actor.
    """
    return JournalService(db, current_user)
