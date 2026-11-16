from sqlalchemy.orm import Session

from core.app_init import init_models

from modules.site.business.code_sequences import give_next_code
from modules.site.types.site_types import CodeKind
from tests.factories import create_site, open_fresh_season


def test_codes_count_per_kind_site_and_season(db: Session) -> None:
    """
    Each kind counts on its own per Site and Season, with its letter: Lots carry none, Expenses a C.
    """
    init_models()
    site = create_site(db)
    season = open_fresh_season(db)

    codes = [give_next_code(db, site, season, CodeKind.LOT), give_next_code(db, site, season, CodeKind.LOT), give_next_code(db, site, season, CodeKind.EXPENSE)]

    assert codes == [f"TS-{season.code}-0001", f"TS-{season.code}-0002", f"TS-C{season.code}-0001"]
