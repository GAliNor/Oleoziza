from decimal import Decimal

from modules.user.constants.user_constants import ACCOUNTANT_DEFAULT_PERMISSIONS, OPERATOR_DEFAULT_PERMISSIONS
from modules.user.types.user_types import LoginMethod, Permission, Role
from seeds.constants.demo_seed_constants import SITE_OUJDA_ID
from seeds.types.seed_types import SiteSeed, UserSeed


SITE_BERKANE_ID = "7d1c2a4e-1f0b-4a51-9c39-1a2b3c4d5e02"

SITE_BERKANE = SiteSeed(SITE_BERKANE_ID, "BK", "Huilerie de Berkane (audit)", "berkane", "Berkane", "Route d'Ahfir, km 2")

BERKANE_TANKS: tuple[tuple[str, int, Decimal], ...] = (
    ("7a4c0000-0002-4000-8000-000000000001", 1, Decimal("20000")),
    ("7a4c0000-0002-4000-8000-000000000002", 2, Decimal("10000")),
)

BERKANE_PRESS_LINES: tuple[tuple[str, int, str | None], ...] = (
    ("11e00000-0002-4000-8000-000000000001", 1, None),
    ("11e00000-0002-4000-8000-000000000002", 2, None),
)

AUDIT_PASSWORD = "AuditLocal2026"

AUDIT_USERS: tuple[UserSeed, ...] = (
    UserSeed(
        "a3f1c6e2-00a0-4c1e-9b1a-000000000001",
        Role.OPERATOR,
        "Audit",
        "Operateur Oujda",
        (LoginMethod.EMAIL_PASSWORD,),
        email="audit.operator.oujda@oleoziza.test",
        password=AUDIT_PASSWORD,
        permissions_by_site={SITE_OUJDA_ID: OPERATOR_DEFAULT_PERMISSIONS},
    ),
    UserSeed(
        "a3f1c6e2-00a0-4c1e-9b1a-000000000002",
        Role.OPERATOR,
        "Audit",
        "Operateur Berkane",
        (LoginMethod.EMAIL_PASSWORD,),
        email="audit.operator.berkane@oleoziza.test",
        password=AUDIT_PASSWORD,
        permissions_by_site={SITE_BERKANE_ID: OPERATOR_DEFAULT_PERMISSIONS},
    ),
    UserSeed(
        "a3f1c6e2-00a0-4c1e-9b1a-000000000003",
        Role.MANAGEMENT,
        "Audit",
        "Gerant Berkane",
        (LoginMethod.EMAIL_PASSWORD,),
        email="audit.manager.berkane@oleoziza.test",
        password=AUDIT_PASSWORD,
        permissions_by_site={SITE_BERKANE_ID: tuple(Permission)},
    ),
    UserSeed(
        "a3f1c6e2-00a0-4c1e-9b1a-000000000004",
        Role.ACCOUNTANT,
        "Audit",
        "Comptable deux Sites",
        (LoginMethod.EMAIL_PASSWORD,),
        email="audit.accountant.both@oleoziza.test",
        password=AUDIT_PASSWORD,
        permissions_by_site={SITE_OUJDA_ID: ACCOUNTANT_DEFAULT_PERMISSIONS, SITE_BERKANE_ID: ACCOUNTANT_DEFAULT_PERMISSIONS},
    ),
)
