from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from modules.configuration.models.configuration_models import PressLine, Tank
from modules.lot.types.lot_types import LotStatus
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


def test_the_home_reads_production_queue_and_money_in_one_request(client: TestClient, db: Session) -> None:
    """
    One pressed Lot and one waiting: the period's production, the queue, the Press Line's work, and the sales for someone who sees the finances.
    """
    site = create_site(db)
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add_all([line, Tank(site_id=site.id, number=1, capacity_in_litres=Decimal("5000"))])
    db.flush()
    pressed = create_lot(db, site, line.id)
    now = datetime.now(timezone.utc)
    pressed.status, pressed.pressing_started_at, pressed.pressing_ended_at, pressed.oil_in_litres = LotStatus.PRESSED, now - timedelta(hours=2), now, Decimal("180")
    create_lot(db, site, line.id)
    rights = [Permission.DASHBOARD_VIEW, Permission.FINANCE_VIEW]
    manager = create_staff_user(db, "+212669991201", permissions_by_site={site.id: rights})
    db.commit()

    dashboard = client.get("/api/dashboard", params={"siteId": str(site.id), "period": "today"}, headers=build_auth_header(manager, {site.id: rights})).json()

    assert (dashboard["production"]["oliveKg"], dashboard["production"]["oilLitres"], dashboard["production"]["receptions"]) == (2000, 180, 2)
    assert dashboard["production"]["yieldPerQuintal"] == 18
    assert dashboard["sites"][0]["queue"] == 1
    assert (dashboard["pressLines"][0]["lots"], dashboard["pressLines"][0]["pressingHours"]) == (1, 2)
    assert dashboard["sales"]["figures"]["revenue"] == 1000
    assert dashboard["expenseSummary"]["total"] == 0
