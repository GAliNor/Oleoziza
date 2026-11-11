from decimal import Decimal

from modules.configuration.types.configuration_types import ConfigurationValueKey, PaymentMethod, SettingKey


SETTING_KEY_BY_VALUE_KEY: dict[ConfigurationValueKey, SettingKey] = {
    ConfigurationValueKey.MILLING_RATE: SettingKey.MILLING_RATE_PER_KG,
    ConfigurationValueKey.DISCOUNT_LIMIT: SettingKey.DISCOUNT_LIMIT_PERCENT,
    ConfigurationValueKey.OIL_PRICE: SettingKey.OIL_PRICE_PER_LITRE,
}

DEFAULT_VALUES: dict[ConfigurationValueKey, Decimal] = {
    ConfigurationValueKey.MILLING_RATE: Decimal("0.50"),
    ConfigurationValueKey.DISCOUNT_LIMIT: Decimal("0"),
    ConfigurationValueKey.OIL_PRICE: Decimal("40"),
}

DEFAULT_BOX_CAPACITY_IN_KG = Decimal("1000")

PAYMENT_METHOD_ORDER: tuple[PaymentMethod, ...] = (PaymentMethod.CASH, PaymentMethod.CHEQUE, PaymentMethod.TRANSFER, PaymentMethod.OIL)

MAX_DISCOUNT_LIMIT_PERCENT = Decimal("100")

HISTORY_LENGTH = 50

CONFIGURATION_CHANGED_ACTION = "configuration.changed"
