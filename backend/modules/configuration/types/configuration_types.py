from enum import StrEnum


class SettingKey(StrEnum):
    """
    The prices of a Site's Configuration that keep their history.
    """

    MILLING_RATE_PER_KG = "milling_rate_per_kg"
    DISCOUNT_LIMIT_PERCENT = "discount_limit_percent"
    OIL_PRICE_PER_LITRE = "oil_price_per_litre"
    DAILY_PRICE_PER_KG = "daily_price_per_kg"


class PaymentMethod(StrEnum):
    """
    The four fixed ways a Payment is made.
    """

    CASH = "cash"
    CHEQUE = "cheque"
    TRANSFER = "transfer"
    OIL = "oil"
