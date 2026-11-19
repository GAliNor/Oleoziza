from types import SimpleNamespace
from typing import Any, cast
from uuid import UUID

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.config import Settings, get_settings
from core.exceptions import SeedRefusedError
from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.configuration.models.configuration_models import Tank
from modules.site.models.site_models import Site
from modules.user.models.user_models import SiteAssignment
from seeds.constants.audit_seed_constants import AUDIT_USERS, SITE_BERKANE_ID
from seeds.constants.demo_seed_constants import SITE_OUJDA_ID, TANKS
from seeds.services.audit_seed_services import AuditSeedService


def build_audit_seed(db: Any, environment: str | None = None) -> AuditSeedService:
    """
    Build the audit seed on a session, with the real settings or a stub naming another environment.

    Args:
        db (Any): Session, or None when the run must refuse before touching it.
        environment (str | None): Environment to pretend to run in, None for the real settings.

    Returns:
        AuditSeedService: Seed ready to run.
    """
    settings = get_settings() if environment is None else cast(Settings, SimpleNamespace(CURRENT_ENV=environment))
    return AuditSeedService(db, settings, cast(RustFSClient, None))


def list_site_ids_by_user(db: Session) -> dict[UUID, set[UUID]]:
    """
    Read the Sites each audit User is assigned to.

    Args:
        db (Session): Test session.

    Returns:
        dict[UUID, set[UUID]]: Site ids per audit User id.
    """
    user_ids = [UUID(user.id) for user in AUDIT_USERS]
    site_ids_by_user: dict[UUID, set[UUID]] = {user_id: set() for user_id in user_ids}
    for user_id, site_id in db.execute(select(SiteAssignment.user_id, SiteAssignment.site_id).where(SiteAssignment.user_id.in_(user_ids))):
        site_ids_by_user[user_id].add(site_id)
    return site_ids_by_user


def test_audit_seed_refuses_to_run_in_production() -> None:
    """
    The audit fixtures carry a known password, so they never reach a production database.
    """
    with pytest.raises(SeedRefusedError) as error:
        build_audit_seed(None, "production").run()

    assert error.value.code == "production"


def test_audit_seed_gives_each_actor_only_their_sites_and_reruns_cleanly(db: Session) -> None:
    """
    Each audit User holds exactly the Sites the security matrix relies on, a second run adds no copies, and Oujda keeps its own Tanks.
    """
    if db.get(Site, UUID(SITE_OUJDA_ID)) is None:
        pytest.skip("demo seed not loaded")
    oujda, berkane = UUID(SITE_OUJDA_ID), UUID(SITE_BERKANE_ID)

    build_audit_seed(db).run()
    build_audit_seed(db).run()

    assert list(list_site_ids_by_user(db).values()) == [{oujda}, {berkane}, {berkane}, {oujda, berkane}]
    assert db.scalar(select(func.count()).select_from(SiteAssignment).where(SiteAssignment.user_id.in_([UUID(user.id) for user in AUDIT_USERS]))) == 5
    assert {tank.site_id for tank in db.scalars(select(Tank).where(Tank.id.in_([UUID(tank_id) for tank_id, _, _ in TANKS])))} == {oujda}
