from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.site.models.site_models import CodeSequence, Season, Site
from modules.site.types.site_types import CodeKind


CODE_LETTER_BY_KIND = {CodeKind.LOT: "", CodeKind.PAYMENT: "P", CodeKind.REFUND: "R", CodeKind.WITHDRAWAL: "W", CodeKind.PAYOUT: "V", CodeKind.EXPENSE: "C"}


def give_next_code(db: Session, site: Site, season: Season, kind: CodeKind) -> str:
    """
    Hand out the next readable code of one kind on one Site in one Season, locking its counter so two devices syncing at once never get the same number.

    Args:
        db (Session): Session of the record being created.
        site (Site): Site of the record.
        season (Season): Season of the record.
        kind (CodeKind): Kind of record.

    Returns:
        str: `<Site>-<letter><Season>-<4-digit number>`, such as OJ-2627-0001 for a Lot or OJ-C2627-0001 for an Expense.
    """
    sequence = db.scalar(select(CodeSequence).where(CodeSequence.site_id == site.id, CodeSequence.season_id == season.id, CodeSequence.kind == kind).with_for_update())
    if sequence is None:
        sequence = CodeSequence(site_id=site.id, season_id=season.id, kind=kind, last_number=0)
        db.add(sequence)
    sequence.last_number += 1
    db.flush()
    return f"{site.code}-{CODE_LETTER_BY_KIND[kind]}{season.code}-{sequence.last_number:04d}"
