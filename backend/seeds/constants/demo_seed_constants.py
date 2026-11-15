from datetime import date
from decimal import Decimal

from modules.configuration.types.configuration_types import PaymentMethod, SettingKey
from modules.user.types.user_types import LoginMethod, Permission, Role, Title
from seeds.types.seed_types import SiteSeed, UserSeed


SITE_OUJDA_ID = "7d1c2a4e-1f0b-4a51-9c39-1a2b3c4d5e01"

SEASON_ID = "5e450000-2627-4000-8000-000000000001"

SEASON_CODE = "2627"

SEASON_LABEL = "Saison 2026-2027"

SEASON_STARTS_ON = date(2026, 11, 1)

SEASON_ENDS_ON = date(2027, 1, 31)

PAST_SEASON_ID = "5e450000-2526-4000-8000-000000000001"

PAST_SEASON_CODE = "2526"

PAST_SEASON_LABEL = "Saison 2025-2026"

PAST_SEASON_STARTS_ON = date(2025, 11, 1)

PAST_SEASON_ENDS_ON = date(2026, 1, 31)

PAST_PRICE_CHANGES: tuple[tuple[SettingKey, Decimal, date], ...] = (
    (SettingKey.MILLING_RATE_PER_KG, Decimal("0.45"), date(2025, 11, 1)),
    (SettingKey.DISCOUNT_LIMIT_PERCENT, Decimal("5"), date(2025, 11, 1)),
    (SettingKey.OIL_PRICE_PER_LITRE, Decimal("36"), date(2025, 11, 1)),
    (SettingKey.OIL_PRICE_PER_LITRE, Decimal("38"), date(2025, 12, 15)),
)

SITES: tuple[SiteSeed, ...] = (SiteSeed(SITE_OUJDA_ID, "OJ", "AMANA OLIVE D’ORIENT", "oujda-angad", "Oujda", "Route de Taza, km 5"),)

OWNER = UserSeed(
    "a3f1c6e2-0001-4c1e-9b1a-000000000001",
    Role.MANAGEMENT,
    "Mohammed",
    "Taibi",
    (LoginMethod.EMAIL_PASSWORD, LoginMethod.PHONE_PIN),
    Title.DR,
    "+212661100001",
    "m.taibi@oleoziza.ma",
    "1234",
    "Oleoziza2026",
    is_owner=True,
    permissions_by_site={SITE_OUJDA_ID: tuple(Permission)},
)

PRICES: dict[SettingKey, Decimal] = {
    SettingKey.MILLING_RATE_PER_KG: Decimal("0.50"),
    SettingKey.DISCOUNT_LIMIT_PERCENT: Decimal("10"),
    SettingKey.OIL_PRICE_PER_LITRE: Decimal("40"),
}

PAYMENT_METHODS: dict[PaymentMethod, tuple[bool, bool]] = {
    PaymentMethod.CASH: (True, False),
    PaymentMethod.CHEQUE: (True, True),
    PaymentMethod.TRANSFER: (True, True),
    PaymentMethod.OIL: (True, False),
}

BOX_COUNT = 24

BOX_CAPACITY_IN_KG = Decimal("1000")

TANKS: tuple[tuple[str, int, Decimal], ...] = (
    ("7a4c0000-0001-4000-8000-000000000001", 1, Decimal("20000")),
    ("7a4c0000-0001-4000-8000-000000000002", 2, Decimal("20000")),
    ("7a4c0000-0001-4000-8000-000000000003", 3, Decimal("10000")),
    ("7a4c0000-0001-4000-8000-000000000004", 4, Decimal("10000")),
    ("7a4c0000-0001-4000-8000-000000000005", 5, Decimal("5000")),
)

PRESS_LINES: tuple[tuple[str, int, str | None], ...] = tuple((f"11e00000-0001-4000-8000-{number:012d}", number, None) for number in range(1, 6))
