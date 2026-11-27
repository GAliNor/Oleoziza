from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from modules.ai.business.ai_pricing import format_budget_month, get_budget_month_bounds, parse_budget_month
from modules.ai.business.ai_queries import delete_expired_payloads, list_calls, list_providers, sum_month_spend_by_provider, sum_usage_by_feature, sum_usage_by_member
from modules.ai.helpers.ai_mappers import map_call
from modules.ai.models.ai_models import AiCallPayload
from modules.ai.types.ai_types import AiFeature, AiProviderBudgetOut, AiUsageOut, AiUsageTotalOut


class AiUsageService:
    def __init__(self, db: Session) -> None:
        """
        Read the usage ledger for the Owner and the Owner, and purge kept payloads.

        Args:
            db (Session): Database session.
        """
        self.db = db

    def get_usage(self, month: str | None, feature: AiFeature | None, user_id: UUID | None, offset: int, limit: int) -> AiUsageOut:
        """
        Load one month of AI usage: each key against its budget, totals by AI feature and by Team member, and a page of calls.

        Args:
            month (str | None): "YYYY-MM", the current month when None.
            feature (AiFeature | None): Only this AI feature in the call list.
            user_id (UUID | None): Only this Team member in the call list.
            offset (int): Calls skipped.
            limit (int): Page size.

        Returns:
            AiUsageOut: The month's usage.

        Raises:
            RefusedError: ai_month_invalid (422).
        """
        try:
            moment = parse_budget_month(month, datetime.now(UTC))
        except ValueError as error:
            raise RefusedError("ai_month_invalid", 422) from error
        start, end = get_budget_month_bounds(moment)
        spend = sum_month_spend_by_provider(self.db, start, end)
        calls, total = list_calls(self.db, start, end, feature, user_id, offset, limit)
        return AiUsageOut(
            month=format_budget_month(moment),
            budgets=[
                AiProviderBudgetOut(
                    provider_id=provider.id,
                    label=provider.label,
                    monthly_budget_usd=provider.monthly_budget_usd,
                    spent_usd=spend.get(provider.id, (0, 0))[0],
                    reserved_usd=spend.get(provider.id, (0, 0))[1],
                )
                for provider in list_providers(self.db)
            ],
            by_feature=[AiUsageTotalOut(key=feature_row.value, label=feature_row.value, call_count=count, cost_usd=cost) for feature_row, count, cost in sum_usage_by_feature(self.db, start, end)],
            by_member=[AiUsageTotalOut(key=str(member_id or ""), label=name or "", call_count=count, cost_usd=cost) for member_id, name, count, cost in sum_usage_by_member(self.db, start, end)],
            calls=[map_call(call, user_name, provider_label) for call, user_name, provider_label in calls],
            total=total,
        )

    def purge_expired_payloads(self) -> int:
        """
        Delete every kept request and response past its keeping period.

        Returns:
            int: Number deleted.
        """
        deleted = delete_expired_payloads(self.db, date.today())
        self.db.commit()
        return deleted


def get_ai_usage_service(db: Session = Depends(get_db)) -> AiUsageService:
    """
    Build the AI usage service for a request.

    Args:
        db (Session): Request database session.

    Returns:
        AiUsageService: Service bound to the session.
    """
    return AiUsageService(db)
