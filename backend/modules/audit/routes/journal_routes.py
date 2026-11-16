from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from modules.audit.services.journal_services import JournalService, get_journal_service
from modules.audit.types.audit_types import ActivityGroup, JournalDaySummaryOut, JournalPageOut


router = APIRouter(prefix="/journal", tags=["audit"])

PAGE_SIZE = 25

MAX_PAGE_SIZE = 100


@router.get("/summary", response_model=JournalDaySummaryOut)
def get_day_summary(site_id: UUID = Query(alias="siteId"), day: date = Query(), journal_service: JournalService = Depends(get_journal_service)) -> JournalDaySummaryOut:
    """
    Sum up a day on a Site.

    Args:
        site_id (UUID): Site.
        day (date): Day.
        journal_service (JournalService): Injected journal service.

    Returns:
        JournalDaySummaryOut: The day at a glance.
    """
    return journal_service.get_day_summary(site_id, day)


@router.get("", response_model=JournalPageOut)
def page_day(
    site_id: UUID = Query(alias="siteId"),
    day: date = Query(),
    group: ActivityGroup | None = None,
    person: str | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    journal_service: JournalService = Depends(get_journal_service),
) -> JournalPageOut:
    """
    Read one page of a day's events.

    Args:
        site_id (UUID): Site.
        day (date): Day.
        group (ActivityGroup | None): Group kept.
        person (str | None): Name kept.
        offset (int): First row.
        limit (int): Rows per page.
        journal_service (JournalService): Injected journal service.

    Returns:
        JournalPageOut: The page and its size.
    """
    items, total = journal_service.page_day(site_id, day, group, person, offset, limit)
    return JournalPageOut(items=items, total=total)
