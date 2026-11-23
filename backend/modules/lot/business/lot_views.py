from collections import defaultdict
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.helpers import APP_TIME_ZONE
from modules.client.models.client_models import Client
from modules.configuration.models.configuration_models import Box, OliveVariety
from modules.finance.business.client_credit import get_lot_credits
from modules.finance.models.finance_models import Discount, Payment, PaymentAllocation
from modules.finance.types.finance_types import DiscountState, PaymentStatus
from modules.lot.business.lot_photos import list_photo_steps
from modules.lot.business.lot_rate_views import list_rate_corrections, map_rate_correction
from modules.lot.models.lot_models import BoxOccupancy, Lot, Notification
from modules.lot.types.lot_types import LotDiscountOut, LotMoveOut, LotNotificationOut, LotOut, LotStatus, LotStorageOut, NotificationChoice, NotificationStatus
from modules.oil.models.oil_models import Storage, StorageDraw, Withdrawal, WithdrawalLine
from modules.user.models.user_models import User


def build_lot_views(db: Session, lots: list[Lot]) -> list[LotOut]:
    """
    Shape many Lots for the screens in a fixed number of queries, whatever their count: each related table is read once for all of them.

    Args:
        db (Session): Session to read with.
        lots (list[Lot]): Lot rows.

    Returns:
        list[LotOut]: The Lots in the same order.
    """
    if not lots:
        return []
    lot_ids = [lot.id for lot in lots]
    clients = {client.id: client for client in db.scalars(select(Client).where(Client.id.in_({lot.client_id for lot in lots})))}
    varieties = dict(db.execute(select(OliveVariety.id, OliveVariety.name)).all())
    box_numbers = list_box_numbers(db, lot_ids)
    storages, drawn_by_storage = list_storages(db, lot_ids)
    withdrawn_by_lot, last_withdrawal_by_lot = list_withdrawals(db, lot_ids)
    discounts = list_current_discounts(db, lot_ids)
    notifications = list_notifications(db, lot_ids)
    paid_by_lot, pending_by_lot = list_allocated_amounts(db, lot_ids)
    credit_by_lot = get_lot_credits(db, lot_ids)
    corrections = list_rate_corrections(db, lot_ids)
    photo_steps = list_photo_steps(db, lot_ids)
    user_ids = {user_id for lot in lots for user_id in (lot.created_by_id, lot.pressing_started_by_id, lot.pressing_ended_by_id)}
    user_ids |= {storage.created_by_id for lot_storages in storages.values() for storage in lot_storages}
    user_ids |= {user_id for discount in discounts.values() for user_id in (discount.created_by_id, discount.decided_by_id)}
    user_ids |= {withdrawal.created_by_id for withdrawal in last_withdrawal_by_lot.values()}
    user_ids |= {correction.created_by_id for lot_corrections in corrections.values() for correction in lot_corrections}
    names = list_user_names(db, {user_id for user_id in user_ids if user_id})
    return [
        build_lot_view(
            lot,
            clients.get(lot.client_id),
            varieties.get(lot.olive_variety_id, lot.olive_variety_id),
            box_numbers.get(lot.id, []),
            [map_storage(storage, drawn_by_storage.get(storage.id, Decimal(0)), names) for storage in storages.get(lot.id, [])],
            withdrawn_by_lot.get(lot.id, Decimal(0)),
            last_withdrawal_by_lot.get(lot.id),
            discounts.get(lot.id),
            notifications.get(lot.id, []),
            paid_by_lot.get(lot.id, Decimal(0)),
            pending_by_lot.get(lot.id, Decimal(0)),
            names,
            credit_by_lot.get(lot.id, Decimal(0)),
        ).model_copy(update={"rate_corrections": [map_rate_correction(correction, names) for correction in corrections.get(lot.id, [])], "photo_steps": photo_steps.get(lot.id, [])})
        for lot in lots
    ]


def build_lot_view(
    lot: Lot,
    client: Client | None,
    variety_name: str,
    box_numbers: list[int],
    storages: list[LotStorageOut],
    withdrawn: Decimal,
    last_withdrawal: Withdrawal | None,
    discount: Discount | None,
    notifications: list[LotNotificationOut],
    paid: Decimal,
    pending: Decimal,
    names: dict[UUID, str],
    credit: Decimal = Decimal(0),
) -> LotOut:
    """
    Shape one Lot from the rows already read for it.

    Args:
        lot (Lot): Lot row.
        client (Client | None): Its Client.
        variety_name (str): Its variety's name.
        box_numbers (list[int]): Boxes it occupied.
        storages (list[LotStorageOut]): Its oil in Tanks.
        withdrawn (Decimal): Litres taken away.
        last_withdrawal (Withdrawal | None): Its latest Withdrawal.
        discount (Discount | None): Its current Discount.
        notifications (list[LotNotificationOut]): Messages sent about it.
        paid (Decimal): Confirmed Allocations.
        pending (Decimal): Pending Allocations.
        names (dict[UUID, str]): Names of the Users involved.
        credit (Decimal): Credit Note Uses taken off its fee.

    Returns:
        LotOut: The Lot as the screens read it.
    """
    return LotOut(
        id=lot.id,
        code=lot.code or "",
        site_id=lot.site_id,
        client_id=lot.client_id,
        client_name=client.display_name if client else "",
        mode=lot.mode,
        variety=variety_name,
        status=lot.status,
        net_kg=float(lot.net_weight_in_kg),
        oil_litres=float(lot.oil_in_litres) if lot.oil_in_litres is not None else None,
        withdrawn_litres=float(withdrawn),
        box_numbers=box_numbers,
        press_line_id=lot.press_line_id,
        planned_start_at=lot.planned_start_at,
        storages=storages,
        daily_price_per_kg=float(lot.daily_price_per_kg) if lot.daily_price_per_kg is not None else None,
        milling_rate_per_kg=float(lot.milling_rate_per_kg or 0),
        discount=map_discount(discount, names) if discount else None,
        notification_choice=lot.notification_choice,
        is_contact_missing=is_contact_missing(lot.notification_choice, client),
        notifications=notifications,
        paid_dh=float(paid),
        pending_dh=float(pending),
        credit_dh=float(credit),
        moves=build_moves(lot, last_withdrawal, names),
        photo_steps=[],
        received_at=lot.entered_at,
        received_by=names.get(lot.created_by_id, "") if lot.created_by_id else "",
    )


def build_moves(lot: Lot, last_withdrawal: Withdrawal | None, names: dict[UUID, str]) -> list[LotMoveOut]:
    """
    Derive the statuses a Lot went through from its own timestamps and its latest Withdrawal.

    Args:
        lot (Lot): Lot row.
        last_withdrawal (Withdrawal | None): Its latest Withdrawal.
        names (dict[UUID, str]): Names of the Users involved.

    Returns:
        list[LotMoveOut]: Moves in order.
    """
    moves = [LotMoveOut(status=LotStatus.WAITING, at=lot.entered_at, by=names.get(lot.created_by_id, "") if lot.created_by_id else "")]
    if lot.pressing_started_at:
        moves.append(LotMoveOut(status=LotStatus.PRESSING, at=lot.pressing_started_at, by=names.get(lot.pressing_started_by_id, "") if lot.pressing_started_by_id else ""))
    if lot.pressing_ended_at:
        moves.append(LotMoveOut(status=LotStatus.PRESSED, at=lot.pressing_ended_at, by=names.get(lot.pressing_ended_by_id, "") if lot.pressing_ended_by_id else ""))
    if lot.status == LotStatus.WITHDRAWN and last_withdrawal:
        moves.append(LotMoveOut(status=LotStatus.WITHDRAWN, at=last_withdrawal.entered_at, by=names.get(last_withdrawal.created_by_id, "") if last_withdrawal.created_by_id else ""))
    return moves


def is_contact_missing(choice: NotificationChoice, client: Client | None) -> bool:
    """
    Tell whether the Client can't be reached the way they chose: WhatsApp or SMS without a phone, an email without an address.

    Args:
        choice (NotificationChoice): Channel chosen at Reception.
        client (Client | None): The Lot's Client.

    Returns:
        bool: True when the chosen channel has no contact.
    """
    if client is None or choice == NotificationChoice.NONE:
        return False
    return not client.email if choice == NotificationChoice.EMAIL else not client.phone


def list_user_names(db: Session, user_ids: set[UUID]) -> dict[UUID, str]:
    """
    Read the names of many Users in one query.

    Args:
        db (Session): Session to read with.
        user_ids (set[UUID]): Users to name.

    Returns:
        dict[UUID, str]: « First Last » per User.
    """
    if not user_ids:
        return {}
    return {user_id: f"{first} {last}" for user_id, first, last in db.execute(select(User.id, User.first_name, User.last_name).where(User.id.in_(user_ids)))}


def list_box_numbers(db: Session, lot_ids: list[UUID]) -> dict[UUID, list[int]]:
    """
    Read the Box numbers each Lot occupied, in one query.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        dict[UUID, list[int]]: Box numbers per Lot, ascending.
    """
    numbers: dict[UUID, list[int]] = defaultdict(list)
    for lot_id, number in db.execute(select(BoxOccupancy.lot_id, Box.number).join(Box, Box.id == BoxOccupancy.box_id).where(BoxOccupancy.lot_id.in_(lot_ids)).order_by(Box.number)):
        if number not in numbers[lot_id]:
            numbers[lot_id].append(number)
    return numbers


def list_storages(db: Session, lot_ids: list[UUID]) -> tuple[dict[UUID, list[Storage]], dict[UUID, Decimal]]:
    """
    Read the Lots' Storages and what was drawn from each, in two queries.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        tuple[dict[UUID, list[Storage]], dict[UUID, Decimal]]: Storages per Lot, and litres drawn per Storage (reversed draws left out).
    """
    storages: dict[UUID, list[Storage]] = defaultdict(list)
    for storage in db.scalars(select(Storage).where(Storage.lot_id.in_(lot_ids)).order_by(Storage.stored_from)):
        storages[storage.lot_id].append(storage)
    storage_ids = [storage.id for lot_storages in storages.values() for storage in lot_storages]
    drawn = dict(db.execute(select(StorageDraw.storage_id, func.sum(StorageDraw.oil_in_litres)).where(StorageDraw.storage_id.in_(storage_ids), StorageDraw.is_reversed.is_(False)).group_by(StorageDraw.storage_id)).all()) if storage_ids else {}
    return storages, drawn


def list_withdrawals(db: Session, lot_ids: list[UUID]) -> tuple[dict[UUID, Decimal], dict[UUID, Withdrawal]]:
    """
    Read the litres each Lot gave away and its latest Withdrawal, in two queries.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        tuple[dict[UUID, Decimal], dict[UUID, Withdrawal]]: Litres withdrawn per Lot, and the latest Withdrawal per Lot.
    """
    litres = func.sum(WithdrawalLine.container_in_litres * WithdrawalLine.container_count)
    withdrawn = dict(db.execute(select(Withdrawal.lot_id, litres).join(WithdrawalLine, WithdrawalLine.withdrawal_id == Withdrawal.id).where(Withdrawal.lot_id.in_(lot_ids)).group_by(Withdrawal.lot_id)).all())
    latest: dict[UUID, Withdrawal] = {}
    for withdrawal in db.scalars(select(Withdrawal).where(Withdrawal.lot_id.in_(lot_ids)).order_by(Withdrawal.entered_at)):
        latest[withdrawal.lot_id] = withdrawal
    return withdrawn, latest


def list_current_discounts(db: Session, lot_ids: list[UUID]) -> dict[UUID, Discount]:
    """
    Read each Lot's Discount in force, or its latest refused one, in one query.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        dict[UUID, Discount]: The Discount to show per Lot.
    """
    current: dict[UUID, Discount] = {}
    for discount in db.scalars(select(Discount).where(Discount.lot_id.in_(lot_ids)).order_by(Discount.created_at)):
        existing = current.get(discount.lot_id)
        if existing is None or existing.state == DiscountState.REFUSED or discount.state != DiscountState.REFUSED:
            current[discount.lot_id] = discount
    return current


def list_notifications(db: Session, lot_ids: list[UUID]) -> dict[UUID, list[LotNotificationOut]]:
    """
    Read the messages sent about the Lots, in one query.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        dict[UUID, list[LotNotificationOut]]: Notifications per Lot, oldest first.
    """
    notifications: dict[UUID, list[LotNotificationOut]] = defaultdict(list)
    for notification in db.scalars(select(Notification).where(Notification.lot_id.in_(lot_ids)).order_by(Notification.sent_at)):
        notifications[notification.lot_id].append(LotNotificationOut(event=notification.event, channel=notification.channel.value, at=notification.sent_at, is_failed=notification.status == NotificationStatus.FAILED, failure_reason=notification.failure_reason))
    return notifications


def list_allocated_amounts(db: Session, lot_ids: list[UUID]) -> tuple[dict[UUID, Decimal], dict[UUID, Decimal]]:
    """
    Sum what Payments allocated to each Lot, confirmed and pending apart, in one query.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        tuple[dict[UUID, Decimal], dict[UUID, Decimal]]: Confirmed and pending amounts per Lot.
    """
    paid: dict[UUID, Decimal] = {}
    pending: dict[UUID, Decimal] = {}
    query = select(PaymentAllocation.lot_id, Payment.status, func.sum(PaymentAllocation.amount)).join(Payment, Payment.id == PaymentAllocation.payment_id).where(PaymentAllocation.lot_id.in_(lot_ids), Payment.status.in_((PaymentStatus.CONFIRMED, PaymentStatus.PENDING))).group_by(PaymentAllocation.lot_id, Payment.status)
    for lot_id, status, amount in db.execute(query):
        (paid if status == PaymentStatus.CONFIRMED else pending)[lot_id] = amount
    return paid, pending


def map_storage(storage: Storage, drawn: Decimal, names: dict[UUID, str]) -> LotStorageOut:
    """
    Shape one Storage for the Lot's screens.

    Args:
        storage (Storage): Storage row.
        drawn (Decimal): Litres drawn from it.
        names (dict[UUID, str]): Names of the Users involved.

    Returns:
        LotStorageOut: The Storage.
    """
    return LotStorageOut(
        id=storage.id,
        tank_id=storage.tank_id,
        litres=float(storage.oil_in_litres),
        withdrawn_litres=float(drawn),
        from_=storage.stored_from.astimezone(APP_TIME_ZONE).date(),
        planned_until=storage.planned_until,
        ended_at=storage.ended_at,
        by=names.get(storage.created_by_id, "") if storage.created_by_id else "",
    )


def map_discount(discount: Discount, names: dict[UUID, str]) -> LotDiscountOut:
    """
    Shape a Discount for the Lot's screens.

    Args:
        discount (Discount): Discount row.
        names (dict[UUID, str]): Names of the Users involved.

    Returns:
        LotDiscountOut: The Discount.
    """
    return LotDiscountOut(
        amount_dh=float(discount.amount),
        percent=float(discount.percent),
        state=discount.state.value,
        given_by=names.get(discount.created_by_id, "") if discount.created_by_id else "",
        given_at=discount.created_at,
        decided_by=names.get(discount.decided_by_id) if discount.decided_by_id else None,
        decided_at=discount.decided_at,
        refusal_reason=discount.refusal_reason,
    )
