from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from core.types import CamelModel


class SettingKey(StrEnum):
    """
    The prices of a Site's Configuration that keep their history.
    """

    MILLING_RATE_PER_KG = "milling_rate_per_kg"
    DISCOUNT_LIMIT_PERCENT = "discount_limit_percent"
    OIL_PRICE_PER_LITRE = "oil_price_per_litre"
    DAILY_PRICE_PER_KG = "daily_price_per_kg"


class NotificationChannel(StrEnum):
    """
    A way the mill messages Clients about their Lots; offered only when implemented and enabled for the company.
    """

    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"


class PaymentMethod(StrEnum):
    """
    The four fixed ways a Payment is made.
    """

    CASH = "cash"
    CHEQUE = "cheque"
    TRANSFER = "transfer"
    OIL = "oil"


class ConfigurationValueKey(StrEnum):
    """
    The price fields of the Configuration page, as the front names them.
    """

    MILLING_RATE = "millingRate"
    DISCOUNT_LIMIT = "discountLimit"
    OIL_PRICE = "oilPrice"


class PaymentMethodSettingOut(CamelModel):
    key: PaymentMethod
    is_enabled: bool
    needs_proof: bool


class TankSettingOut(CamelModel):
    id: UUID
    number: int = Field(gt=0)
    capacity_litres: float = Field(gt=0)


class PressLineSettingOut(CamelModel):
    id: UUID
    number: int = Field(gt=0)
    name: str = ""


class EquipmentSnapshot(CamelModel):
    box_count: int | None = None
    box_capacity_kg: float | None = None
    tanks: list[TankSettingOut] | None = None
    press_lines: list[PressLineSettingOut] | None = None


class MethodChange(CamelModel):
    is_enabled: bool
    needs_proof: bool


class ConfigurationChangeOut(CamelModel):
    id: UUID
    key: str
    value: float | None
    method: MethodChange | None
    equipment: EquipmentSnapshot | None = None
    by: str
    at: datetime


class PriceChangeOut(CamelModel):
    id: UUID
    key: ConfigurationValueKey
    value: float
    effective_from: datetime
    by: str
    is_scheduled: bool


class ConfigurationOut(CamelModel):
    site_id: UUID
    season_id: UUID
    season_label: str
    season_status: str
    price_changes: list[PriceChangeOut]
    milling_rate: float
    discount_limit: float
    oil_price: float
    methods: list[PaymentMethodSettingOut]
    box_count: int
    box_capacity_kg: float
    tanks: list[TankSettingOut]
    press_lines: list[PressLineSettingOut]
    history: list[ConfigurationChangeOut]
    notification_channels: list["NotificationChannelOut"]


class ValueUpdate(CamelModel):
    key: ConfigurationValueKey
    amount: float = Field(ge=0)
    effective_on: date | None = None


class BoxesUpdate(CamelModel):
    count: int = Field(ge=0)
    capacity_kg: float = Field(gt=0)


class ConfigurationUpdateIn(CamelModel):
    id: UUID
    season_id: UUID | None = None
    value: ValueUpdate | None = None
    method: PaymentMethodSettingOut | None = None
    boxes: BoxesUpdate | None = None
    tanks: list[TankSettingOut] | None = None
    press_lines: list[PressLineSettingOut] | None = None


class NotificationChannelOut(CamelModel):
    """
    One Notification Channel as Configuration shows it: whether the mill can send through it yet, and whether Management switched it on.
    """

    channel: NotificationChannel
    is_implemented: bool
    is_enabled: bool


class NotificationChannelUpdateIn(CamelModel):
    """
    Switch one Notification Channel on or off for the whole company.
    """

    is_enabled: bool
