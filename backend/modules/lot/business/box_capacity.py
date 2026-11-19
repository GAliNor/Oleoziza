from decimal import Decimal

from core.exceptions import RefusedError
from modules.configuration.models.configuration_models import Box


def check_box_capacity(boxes: list[Box], net_kg: Decimal) -> None:
    """
    Refuse a Reception whose Boxes, each with its own capacity, can't hold its net weight; equal is enough.

    Args:
        boxes (list[Box]): The Boxes chosen.
        net_kg (Decimal): The Lot's net weight.

    Raises:
        RefusedError: box_capacity_short.
    """
    if sum((box.capacity_in_kg for box in boxes), Decimal(0)) < net_kg:
        raise RefusedError("box_capacity_short", 422)
