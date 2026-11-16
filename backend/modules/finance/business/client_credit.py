from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.finance.models.finance_models import CreditNote, CreditNoteUse


def get_open_credits(db: Session, client_ids: list[UUID] | None = None, site_id: UUID | None = None) -> dict[UUID, Decimal]:
    """
    Sum what each Client's Credit Notes still hold (issued minus used), in two queries.

    Args:
        db (Session): Session to read with.
        client_ids (list[UUID] | None): Clients to read, every Client when None.
        site_id (UUID | None): Only the Credit Notes of one Site (they are used where issued).

    Returns:
        dict[UUID, Decimal]: Open credit per Client, only those above zero.
    """
    issued = select(CreditNote.client_id, func.sum(CreditNote.amount)).group_by(CreditNote.client_id)
    used = select(CreditNote.client_id, func.sum(CreditNoteUse.amount)).join(CreditNote, CreditNote.id == CreditNoteUse.credit_note_id).group_by(CreditNote.client_id)
    if client_ids is not None:
        issued = issued.where(CreditNote.client_id.in_(client_ids))
        used = used.where(CreditNote.client_id.in_(client_ids))
    if site_id is not None:
        issued = issued.where(CreditNote.site_id == site_id)
        used = used.where(CreditNote.site_id == site_id)
    credits = {client_id: amount for client_id, amount in db.execute(issued)}
    for client_id, amount in db.execute(used):
        credits[client_id] -= amount
    return {client_id: amount for client_id, amount in credits.items() if amount > 0}


def get_lot_credits(db: Session, lot_ids: list[UUID]) -> dict[UUID, Decimal]:
    """
    Sum the Credit Note Uses taken off each Lot's fee, in one query.

    Args:
        db (Session): Session to read with.
        lot_ids (list[UUID]): Lots to read.

    Returns:
        dict[UUID, Decimal]: Credit used per Lot.
    """
    query = select(CreditNoteUse.lot_id, func.sum(CreditNoteUse.amount)).where(CreditNoteUse.lot_id.in_(lot_ids)).group_by(CreditNoteUse.lot_id)
    return {lot_id: amount for lot_id, amount in db.execute(query)}


def use_open_credit(db: Session, client_id: UUID, site_id: UUID, lot_id: UUID, fee: Decimal, actor_id: UUID | None) -> Decimal:
    """
    Take a Client's open Credit Notes on a Site off a new Lot's fee, oldest first, as Credit Note Uses in the caller's transaction.

    Args:
        db (Session): Session of the Lot being received.
        client_id (UUID): The Lot's Client.
        site_id (UUID): The Lot's Site.
        lot_id (UUID): The Lot.
        fee (Decimal): Its Milling Fee.
        actor_id (UUID | None): User receiving it.

    Returns:
        Decimal: Credit used.
    """
    remaining_fee = fee
    used_by_note = {note_id: amount for note_id, amount in db.execute(select(CreditNoteUse.credit_note_id, func.sum(CreditNoteUse.amount)).join(CreditNote, CreditNote.id == CreditNoteUse.credit_note_id).where(CreditNote.client_id == client_id).group_by(CreditNoteUse.credit_note_id))}
    for note in db.scalars(select(CreditNote).where(CreditNote.client_id == client_id, CreditNote.site_id == site_id).order_by(CreditNote.created_at)):
        left = note.amount - used_by_note.get(note.id, Decimal(0))
        if remaining_fee <= 0:
            break
        if left <= 0:
            continue
        taken = min(left, remaining_fee)
        db.add(CreditNoteUse(credit_note_id=note.id, lot_id=lot_id, amount=taken, created_by_id=actor_id))
        remaining_fee -= taken
    return fee - remaining_fee
