from datetime import datetime
from typing import Any

from modules.audit.models.audit_models import AuditEvent


StoryParams = dict[str, str | int | float]

CONFIGURATION_CHANGED_ACTION = "configuration.changed"

PRICE_REMOVAL_CHANGES = {"configuration.price_change_cancelled": "cancelled", "configuration.price_change_deleted": "deleted"}

CONFIGURATION_ACTIONS = {CONFIGURATION_CHANGED_ACTION, *PRICE_REMOVAL_CHANGES}


def build_configuration_params(event: AuditEvent) -> StoryParams:
    """
    Tell a Configuration change as flat values the front words: which setting, and what it was and became. Events recorded before the old value was kept tell the new one only.

    Args:
        event (AuditEvent): A configuration event.

    Returns:
        StoryParams: `key`, `change` and the values that kind of change has.
    """
    before, after = event.before or {}, event.after or {}
    if event.action in PRICE_REMOVAL_CHANGES:
        params: StoryParams = {"key": str(before.get("key", "")), "change": PRICE_REMOVAL_CHANGES[event.action], "from": before.get("value", 0)}
        return {**params, "to": after["value"]} if "value" in after else params
    key = str(after.get("key", ""))
    if after.get("method"):
        return {"key": key, "change": "method", **build_method_params(before.get("method"), after["method"])}
    if after.get("equipment"):
        return {"key": key, "change": key, **build_equipment_params(key, before.get("equipment"), after["equipment"])}
    return {"key": key, "change": "value", **build_value_params(event, before, after)}


def build_value_params(event: AuditEvent, before: dict[str, Any], after: dict[str, Any]) -> StoryParams:
    """
    Tell a price change: old price, new price, and the moment it starts when that is later.

    Args:
        event (AuditEvent): The change.
        before (dict[str, Any]): What it replaced.
        after (dict[str, Any]): What it set.

    Returns:
        StoryParams: `from`, `to` and `effectiveFrom`, those known.
    """
    params: StoryParams = {"to": after.get("value") or 0}
    if before.get("value") is not None:
        params["from"] = before["value"]
    starts_at = after.get("effectiveFrom")
    if starts_at and datetime.fromisoformat(starts_at) > event.occurred_at:
        params["effectiveFrom"] = starts_at
    return params


def build_method_params(before: dict[str, bool] | None, after: dict[str, bool]) -> StoryParams:
    """
    Tell what changed on a Payment Method: on or off, proof required or not; everything when its previous state is unknown.

    Args:
        before (dict[str, bool] | None): Its state before.
        after (dict[str, bool]): Its state after.

    Returns:
        StoryParams: `enabled` and `proof`, as `on` or `off`, those that changed.
    """
    names = {"isEnabled": "enabled", "needsProof": "proof"}
    return {name: "on" if after.get(field) else "off" for field, name in names.items() if before is None or before.get(field) != after.get(field)}


def build_equipment_params(key: str, before: dict[str, Any] | None, after: dict[str, Any]) -> StoryParams:
    """
    Tell what changed in the Boxes, Tanks or Press Lines of a Site.

    Args:
        key (str): boxes, tanks or pressLines.
        before (dict[str, Any] | None): The equipment before, None on older events.
        after (dict[str, Any]): The equipment after.

    Returns:
        StoryParams: Counts and capacity for Boxes; the numbers added, removed and changed for the others.
    """
    if key == "boxes":
        params: StoryParams = {"countTo": after.get("boxCount") or 0, "capacityTo": after.get("boxCapacityKg") or 0}
        if before is not None:
            params["countFrom"] = before.get("boxCount") or 0
            params["capacityFrom"] = before.get("boxCapacityKg") or 0
        return params
    items = {item["id"]: item for item in after.get(key) or []}
    if before is None:
        return {"countTo": len(items)}
    previous = {item["id"]: item for item in before.get(key) or []}
    changes = {
        "added": [item for item_id, item in items.items() if item_id not in previous],
        "removed": [item for item_id, item in previous.items() if item_id not in items],
        "changed": [item for item_id, item in items.items() if item_id in previous and item != previous[item_id]],
    }
    return {name: ", ".join(str(item["number"]) for item in changed) for name, changed in changes.items() if changed}
