from modules.assistant.business.semantic_lot_entities import CLIENT_ENTITY, DISCOUNT_ENTITY, LOT_ENTITY, PAYMENT_ENTITY, REFUND_ENTITY
from modules.assistant.business.semantic_stock_entities import EXPENSE_ENTITY, STORAGE_ENTITY, TANK_ENTITY, WITHDRAWAL_ENTITY
from modules.assistant.types.semantic_types import SemanticEntity


ENTITIES: dict[str, SemanticEntity] = {
    entity.name: entity
    for entity in (LOT_ENTITY, CLIENT_ENTITY, PAYMENT_ENTITY, DISCOUNT_ENTITY, REFUND_ENTITY, STORAGE_ENTITY, WITHDRAWAL_ENTITY, TANK_ENTITY, EXPENSE_ENTITY)
}


def describe_entity(entity: SemanticEntity) -> str:
    """
    Describe one entity for the model in a compact line-per-name form: kind, enum values, money marks.

    Args:
        entity (SemanticEntity): Entity to describe.

    Returns:
        str: Its catalogue block.
    """
    money = " [money]" if entity.is_money else ""
    lines = [f"## {entity.name}{money}: {entity.description}"]
    if entity.default_date_field:
        lines.append(f"default date: {entity.default_date_field}")
    if entity.default_filters:
        lines.append("default filters: " + ", ".join(f"{name}={value}" for name, value in entity.default_filters))
    lines.append("fields:")
    for name, item in entity.fields.items():
        values = f" {{{'|'.join(item.values)}}}" if item.values else ""
        lines.append(f"- {name} ({item.kind}{values}{', money' if item.is_money else ''}): {item.description}")
    lines.append("measures:")
    for name, measure in entity.measures.items():
        lines.append(f"- {name} ({measure.kind}{', money' if measure.is_money else ''}): {measure.description}")
    return "\n".join(lines)


def describe_semantic_layer() -> str:
    """
    Describe every entity the Assistant may query, as the fixed (cached) part of its prompt.

    Returns:
        str: The catalogue.
    """
    return "\n\n".join(describe_entity(entity) for entity in ENTITIES.values())
