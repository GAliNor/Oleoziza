from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, delete, func, select
from sqlalchemy.orm import Session

from modules.ai.models.ai_models import AiCall, AiCallPayload, AiFeatureSetting, AiModel, AiProvider
from modules.ai.types.ai_types import AiCallStatus, AiFeature
from modules.user.models.user_models import User


def lock_provider(db: Session, provider_id: UUID) -> AiProvider | None:
    """
    Load a provider and lock its row, so two calls never both pass the budget check of the same key.

    Args:
        db (Session): Open session.
        provider_id (UUID): Provider id.

    Returns:
        AiProvider | None: The locked provider, or None when missing.
    """
    return db.scalars(select(AiProvider).where(AiProvider.id == provider_id).with_for_update()).first()


def sum_month_spend_by_provider(db: Session, start: datetime, end: datetime) -> dict[UUID, tuple[Decimal, Decimal]]:
    """
    Sum, per provider, what calls cost in a month and what running calls still hold in reservation.

    Args:
        db (Session): Open session.
        start (datetime): Month start (inclusive), UTC.
        end (datetime): Month end (exclusive), UTC.

    Returns:
        dict[UUID, tuple[Decimal, Decimal]]: Spent and reserved USD by provider id.
    """
    reserved = case((AiCall.status == AiCallStatus.RESERVED, AiCall.reserved_cost_usd), else_=Decimal("0"))
    spent = case((AiCall.status != AiCallStatus.RESERVED, AiCall.cost_usd), else_=Decimal("0"))
    rows = db.execute(
        select(AiCall.provider_id, func.coalesce(func.sum(spent), 0), func.coalesce(func.sum(reserved), 0))
        .where(AiCall.created_at >= start, AiCall.created_at < end)
        .group_by(AiCall.provider_id)
    ).all()
    return {provider_id: (Decimal(spent_usd), Decimal(reserved_usd)) for provider_id, spent_usd, reserved_usd in rows}


def get_feature_setting(db: Session, feature: AiFeature) -> AiFeatureSetting | None:
    """
    Load the setting of one AI feature.

    Args:
        db (Session): Open session.
        feature (AiFeature): AI feature.

    Returns:
        AiFeatureSetting | None: Its setting, or None when never configured.
    """
    return db.get(AiFeatureSetting, feature)


def list_providers(db: Session) -> list[AiProvider]:
    """
    List every provider by label.

    Args:
        db (Session): Open session.

    Returns:
        list[AiProvider]: Providers.
    """
    return list(db.scalars(select(AiProvider).order_by(AiProvider.label, AiProvider.id)))


def list_models(db: Session) -> list[AiModel]:
    """
    List every model, by provider then name.

    Args:
        db (Session): Open session.

    Returns:
        list[AiModel]: Models.
    """
    return list(db.scalars(select(AiModel).order_by(AiModel.provider_id, AiModel.name, AiModel.id)))


def list_feature_settings(db: Session) -> dict[AiFeature, AiFeatureSetting]:
    """
    Load every configured AI feature setting.

    Args:
        db (Session): Open session.

    Returns:
        dict[AiFeature, AiFeatureSetting]: Settings by feature.
    """
    return {setting.feature: setting for setting in db.scalars(select(AiFeatureSetting))}


def sum_usage_by_feature(db: Session, start: datetime, end: datetime) -> list[tuple[AiFeature, int, Decimal]]:
    """
    Count calls and sum their cost per AI feature in a month.

    Args:
        db (Session): Open session.
        start (datetime): Month start, UTC.
        end (datetime): Month end, UTC.

    Returns:
        list[tuple[AiFeature, int, Decimal]]: Feature, call count and cost, costliest first.
    """
    cost = func.coalesce(func.sum(AiCall.cost_usd), 0)
    rows = db.execute(
        select(AiCall.feature, func.count(AiCall.id), cost).where(AiCall.created_at >= start, AiCall.created_at < end).group_by(AiCall.feature).order_by(cost.desc())
    ).all()
    return [(feature, count, Decimal(total)) for feature, count, total in rows]


def sum_usage_by_member(db: Session, start: datetime, end: datetime) -> list[tuple[UUID | None, str | None, int, Decimal]]:
    """
    Count calls and sum their cost per User in a month.

    Args:
        db (Session): Open session.
        start (datetime): Month start, UTC.
        end (datetime): Month end, UTC.

    Returns:
        list[tuple[UUID | None, str | None, int, Decimal]]: Member id, full name, call count and cost, costliest first.
    """
    cost = func.coalesce(func.sum(AiCall.cost_usd), 0)
    name = func.concat(User.first_name, " ", User.last_name)
    rows = db.execute(
        select(AiCall.user_id, name, func.count(AiCall.id), cost)
        .outerjoin(User, User.id == AiCall.user_id)
        .where(AiCall.created_at >= start, AiCall.created_at < end)
        .group_by(AiCall.user_id, User.first_name, User.last_name)
        .order_by(cost.desc())
    ).all()
    return [(user_id, full_name if user_id else None, count, Decimal(total)) for user_id, full_name, count, total in rows]


def list_calls(
    db: Session, start: datetime, end: datetime, feature: AiFeature | None, user_id: UUID | None, offset: int, limit: int
) -> tuple[list[tuple[AiCall, str | None, str]], int]:
    """
    Page the calls of a month, newest first, with who made them and the provider label.

    Args:
        db (Session): Open session.
        start (datetime): Month start, UTC.
        end (datetime): Month end, UTC.
        feature (AiFeature | None): Only this AI feature when given.
        user_id (UUID | None): Only this User when given.
        offset (int): Rows skipped.
        limit (int): Page size.

    Returns:
        tuple[list[tuple[AiCall, str | None, str]], int]: Rows and the total matching.
    """
    conditions = [AiCall.created_at >= start, AiCall.created_at < end]
    if feature is not None:
        conditions.append(AiCall.feature == feature)
    if user_id is not None:
        conditions.append(AiCall.user_id == user_id)
    total = db.scalar(select(func.count(AiCall.id)).where(*conditions)) or 0
    rows = db.execute(
        select(AiCall, func.concat(User.first_name, " ", User.last_name), AiProvider.label)
        .join(AiProvider, AiProvider.id == AiCall.provider_id)
        .outerjoin(User, User.id == AiCall.user_id)
        .where(*conditions)
        .order_by(AiCall.created_at.desc(), AiCall.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [(call, name if call.user_id else None, label) for call, name, label in rows], total


def delete_expired_payloads(db: Session, today: date) -> int:
    """
    Delete the kept requests and responses whose keeping period is over.

    Args:
        db (Session): Open session.
        today (date): Current date.

    Returns:
        int: Number of payloads deleted.
    """
    return db.execute(delete(AiCallPayload).where(AiCallPayload.purge_after < today)).rowcount or 0
