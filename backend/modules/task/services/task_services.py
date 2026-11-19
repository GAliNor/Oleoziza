from uuid import UUID

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.types import CurrentUser
from modules.auth.models.auth_models import Invitation
from modules.client.models.client_models import Client
from modules.finance.business.lot_fees import list_client_debts
from modules.finance.models.finance_models import Discount, Payment, Refund
from modules.finance.types.finance_types import DiscountState, PaymentStatus, RefundStatus
from modules.lot.business.lot_views import list_user_names
from modules.lot.models.lot_models import Lot
from modules.site.business.site_scope import resolve_site_ids
from modules.task.types.task_types import TaskGroup, TaskKind, TaskOut
from modules.user.models.user_models import SiteAssignment, User
from modules.user.types.user_types import Permission, UserStatus


class TaskService:
    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Keep the session and the User whose to-do list is read.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
        """
        self.db = db
        self.current_user = current_user

    def list_tasks(self, site_ids: list[UUID]) -> list[TaskOut]:
        """
        Read everything waiting on the caller on the Sites asked for, each kind only on the Sites where they hold its Permission, oldest first.

        Args:
            site_ids (list[UUID]): Sites, every Site held when none.

        Returns:
            list[TaskOut]: The tasks.
        """
        scoped = resolve_site_ids(self.db, self.current_user, site_ids)
        tasks = [
            *self._discount_tasks(self._sites_with(scoped, Permission.DISCOUNT_APPROVE)),
            *self._payment_tasks(self._sites_with(scoped, Permission.PAYMENT_CONFIRM)),
            *self._refund_tasks(self._sites_with(scoped, Permission.REFUND_MANAGE)),
            *self._client_tasks(self._sites_with(scoped, Permission.CLIENT_VIEW)),
            *self._invitation_tasks(self._sites_with(scoped, Permission.USER_MANAGE)),
        ]
        return sorted(tasks, key=lambda task: (task.at is None, task.at))

    def _sites_with(self, site_ids: list[UUID], permission: Permission) -> list[UUID]:
        """
        The Sites where the caller holds a Permission.

        Returns:
            list[UUID]: Those Sites.
        """
        return [site_id for site_id in site_ids if self.current_user.has_permission(site_id, permission)]

    def _discount_tasks(self, site_ids: list[UUID]) -> list[TaskOut]:
        """
        Discounts above the limit waiting for a decision.

        Returns:
            list[TaskOut]: One task per pending Discount.
        """
        if not site_ids:
            return []
        rows = self.db.execute(select(Discount, Lot, Client).join(Lot, Lot.id == Discount.lot_id).join(Client, Client.id == Lot.client_id).where(Lot.site_id.in_(site_ids), Discount.state == DiscountState.PENDING)).all()
        names = list_user_names(self.db, {discount.created_by_id for discount, _, _ in rows if discount.created_by_id})
        return [
            TaskOut(id=f"discount-{discount.id}", kind=TaskKind.DISCOUNT, group=TaskGroup.DECIDE, subject=client.display_name, params={"code": lot.code or "", "percent": float(discount.percent), "by": names.get(discount.created_by_id, "")}, amount=float(discount.amount), at=discount.created_at, target_id=lot.id)
            for discount, lot, client in rows
        ]

    def _payment_tasks(self, site_ids: list[UUID]) -> list[TaskOut]:
        """
        Payments waiting to be confirmed.

        Returns:
            list[TaskOut]: One task per pending Payment.
        """
        if not site_ids:
            return []
        rows = self.db.execute(select(Payment, Client).join(Client, Client.id == Payment.client_id).where(Payment.site_id.in_(site_ids), Payment.status == PaymentStatus.PENDING)).all()
        names = list_user_names(self.db, {payment.created_by_id for payment, _ in rows if payment.created_by_id})
        return [TaskOut(id=f"movement-{payment.id}", kind=TaskKind.PAYMENT, group=TaskGroup.DECIDE, subject=client.display_name, params={"code": payment.code or "", "by": names.get(payment.created_by_id, "")}, amount=float(payment.amount), at=payment.entered_at, target_id=payment.id) for payment, client in rows]

    def _refund_tasks(self, site_ids: list[UUID]) -> list[TaskOut]:
        """
        Refunds to make, and those someone else made, waiting for a second person.

        Returns:
            list[TaskOut]: One task per Refund waiting on the caller.
        """
        if not site_ids:
            return []
        rows = self.db.execute(select(Refund, Client).join(Client, Client.id == Refund.client_id).where(Refund.site_id.in_(site_ids), Refund.status.in_((RefundStatus.TO_MAKE, RefundStatus.MADE)))).all()
        waiting = [(refund, client) for refund, client in rows if refund.status == RefundStatus.TO_MAKE or refund.made_by_id != self.current_user.id]
        source_codes = {payment_id: code for payment_id, code in self.db.execute(select(Payment.id, Payment.code).where(Payment.id.in_({refund.source_payment_id for refund, _ in waiting})))} if waiting else {}
        names = list_user_names(self.db, {refund.made_by_id for refund, _ in waiting if refund.made_by_id})
        return [
            TaskOut(
                id=f"refund-{refund.id}",
                kind=TaskKind.REFUND_MAKE if refund.status == RefundStatus.TO_MAKE else TaskKind.REFUND_CONFIRM,
                group=TaskGroup.MONEY,
                subject=client.display_name,
                params={"code": source_codes.get(refund.source_payment_id) or "", "by": names.get(refund.made_by_id, "") if refund.made_by_id else ""},
                amount=float(refund.amount),
                at=refund.made_at or refund.created_at,
                target_id=refund.id,
            )
            for refund, client in waiting
        ]

    def _client_tasks(self, site_ids: list[UUID]) -> list[TaskOut]:
        """
        Clients whose Lots on these Sites still owe money.

        Returns:
            list[TaskOut]: One task per Client who owes.
        """
        if not site_ids:
            return []
        debtors = list_client_debts(self.db, site_ids)
        clients = {client.id: client for client in self.db.scalars(select(Client).where(Client.id.in_(list(debtors))))} if debtors else {}
        return [TaskOut(id=f"client-{client_id}", kind=TaskKind.CLIENT_AT_RISK, group=TaskGroup.FOLLOW, subject=clients[client_id].display_name, params={}, amount=float(amount), at=None, target_id=client_id) for client_id, amount in debtors.items() if client_id in clients]

    def _invitation_tasks(self, site_ids: list[UUID]) -> list[TaskOut]:
        """
        Staff invited to these Sites who haven't chosen their secret yet.

        Returns:
            list[TaskOut]: One task per pending Invitation.
        """
        if not site_ids:
            return []
        users = list(self.db.scalars(select(User).join(SiteAssignment, SiteAssignment.user_id == User.id).where(SiteAssignment.site_id.in_(site_ids), User.status == UserStatus.INVITED).distinct()))
        invited_at = dict(self.db.execute(select(Invitation.user_id, func.max(Invitation.created_at)).where(Invitation.user_id.in_([user.id for user in users])).group_by(Invitation.user_id)).all()) if users else {}
        return [TaskOut(id=f"invitation-{user.id}", kind=TaskKind.INVITATION, group=TaskGroup.FOLLOW, subject=f"{user.first_name} {user.last_name}", params={}, amount=None, at=invited_at.get(user.id), target_id=user.id) for user in users]


def get_task_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> TaskService:
    """
    Build the task service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        TaskService: Service bound to the session and actor.
    """
    return TaskService(db, current_user)
