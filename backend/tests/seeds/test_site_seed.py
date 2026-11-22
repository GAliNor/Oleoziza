from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.app_init import init_models

from modules.site.models.site_models import Site
from seeds.services.site_seed_services import SiteSeedService


def test_an_existing_site_is_kept_and_nothing_is_added(db: Session) -> None:
    """
    Once a Site exists (the Owner made one, or an earlier start seeded Oujda), later starts add no Site.
    """
    init_models()
    db.add(Site(code="ZZ", name="Test", province_id="oujda-angad", city="Oujda", address="Centre"))
    db.flush()
    site_count = db.scalar(select(func.count(Site.id)))

    assert SiteSeedService(db).run() is False
    assert db.scalar(select(func.count(Site.id))) == site_count
