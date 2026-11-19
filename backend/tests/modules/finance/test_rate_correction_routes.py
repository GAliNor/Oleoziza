from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from modules.configuration.models.configuration_models import PressLine
from modules.finance.models.finance_models import RateCorrection
from modules.user.types.user_types import Permission
from tests.factories import build_auth_header, create_lot, create_site, create_staff_user, open_fresh_season


ACCOUNTANT_RIGHTS = [Permission.LOT_SET_PRICE, Permission.PAYMENT_RECORD, Permission.PAYMENT_CONFIRM, Permission.DISCOUNT_GIVE, Permission.FINANCE_VIEW]

CASHIER_RIGHTS = [Permission.PAYMENT_RECORD, Permission.FINANCE_VIEW]


def prepare(db: Session) -> tuple:
    """
    Add a Site with an open Season, a 1,000 kg Lot at 0.50 DH/kg (500 DH), an Accountant who may correct rates and a cashier who may not.

    Args:
        db (Session): Test session.

    Returns:
        tuple: Lot, Accountant headers, cashier headers.
    """
    site = create_site(db)
    open_fresh_season(db)
    line = PressLine(site_id=site.id, number=1)
    db.add(line)
    db.flush()
    lot = create_lot(db, site, line.id)
    accountant = create_staff_user(db, "+212669991201", permissions_by_site={site.id: ACCOUNTANT_RIGHTS})
    cashier = create_staff_user(db, "+212669991202", permissions_by_site={site.id: CASHIER_RIGHTS})
    db.commit()
    return lot, build_auth_header(accountant, {site.id: ACCOUNTANT_RIGHTS}), build_auth_header(cashier, {site.id: CASHIER_RIGHTS})


def correct(client: TestClient, lot: object, headers: dict[str, str], rate: float, reason: str = "Tarif coopérative", event_id: object | None = None) -> object:
    """
    Post one rate correction.

    Returns:
        object: The response.
    """
    return client.post(f"/api/lot/lots/{lot.id}/rate", json={"id": str(event_id or uuid7()), "millingRatePerKg": rate, "reason": reason}, headers=headers)


def pay(client: TestClient, lot: object, headers: dict[str, str], amount: float, is_confirmed: bool) -> None:
    """
    Record a cash Payment on the Lot, confirmed or left pending.
    """
    body = {"id": str(uuid7()), "siteId": str(lot.site_id), "clientId": str(lot.client_id), "lotLinks": [{"lotId": str(lot.id), "amount": amount}], "amount": amount, "method": "cash"}
    payment = client.post("/api/finance/payments", json=body, headers=headers).json()
    if is_confirmed:
        client.post(f"/api/finance/payments/{payment['id']}/decision", json={"status": "confirmed"}, headers=headers)


def test_a_correction_changes_the_rate_and_keeps_its_reason(client: TestClient, db: Session) -> None:
    """
    0.50 → 0.45 DH/kg: the Lot reads the new rate, and its corrections list the old rate, the new one, the reason and who.
    """
    lot, accountant, cashier = prepare(db)

    corrected = correct(client, lot, accountant, 0.45).json()

    assert corrected["millingRatePerKg"] == 0.45
    assert [(item["previousRatePerKg"], item["newRatePerKg"], item["reason"]) for item in corrected["rateCorrections"]] == [(0.5, 0.45, "Tarif coopérative")]
    assert corrected["rateCorrections"][0]["by"]


def test_a_replayed_correction_applies_once(client: TestClient, db: Session) -> None:
    """
    The same event id sent twice records one correction.
    """
    lot, accountant, cashier = prepare(db)
    event_id = uuid7()

    correct(client, lot, accountant, 0.45, event_id=event_id)
    replay = correct(client, lot, accountant, 0.45, event_id=event_id)

    assert replay.status_code == 200
    assert db.scalar(select(func.count()).select_from(RateCorrection).where(RateCorrection.lot_id == lot.id)) == 1


def test_a_correction_needs_the_permission_and_a_reason(client: TestClient, db: Session) -> None:
    """
    A cashier without « Corriger le tarif d'un Lot » is refused; a blank reason is refused.
    """
    lot, accountant, cashier = prepare(db)

    forbidden = correct(client, lot, cashier, 0.45)
    blank = correct(client, lot, accountant, 0.45, reason="   ")

    assert (forbidden.status_code, forbidden.json()) == (403, {"code": "rates_forbidden"})
    assert blank.json() == {"code": "reason_required"}


def test_the_rate_never_drops_the_fee_below_what_is_paid_or_waiting(client: TestClient, db: Session) -> None:
    """
    With 300 DH waiting for confirmation, 0.25 DH/kg (250 DH) is refused and 0.30 DH/kg (300 DH) is allowed.
    """
    lot, accountant, cashier = prepare(db)
    pay(client, lot, cashier, 300, is_confirmed=False)

    too_low = correct(client, lot, accountant, 0.25)
    just_enough = correct(client, lot, accountant, 0.30)

    assert too_low.json() == {"code": "rate_below_paid"}
    assert just_enough.status_code == 200


def test_a_paid_lot_keeps_its_rate(client: TestClient, db: Session) -> None:
    """
    Once the whole fee is paid, the rate can't change any more.
    """
    lot, accountant, cashier = prepare(db)
    pay(client, lot, accountant, 500, is_confirmed=True)

    response = correct(client, lot, accountant, 0.60)

    assert response.json() == {"code": "lot_already_paid"}


def test_the_full_fee_never_drops_below_the_discount(client: TestClient, db: Session) -> None:
    """
    A 100 DH Discount keeps its amount: 0.05 DH/kg (50 DH full fee) is refused, and at 0.40 DH/kg the fee is 400 − 100.
    """
    lot, accountant, cashier = prepare(db)
    client.post(f"/api/lot/lots/{lot.id}/discount", json={"id": str(uuid7()), "amountDh": 100, "percent": 20}, headers=accountant)

    too_low = correct(client, lot, accountant, 0.05)
    corrected = correct(client, lot, accountant, 0.40).json()

    assert too_low.json() == {"code": "rate_below_discount"}
    assert (corrected["millingRatePerKg"], corrected["discount"]["amountDh"]) == (0.4, 100)
