from datetime import date

from modules.client.types.client_types import ClientKind
from modules.user.constants.user_constants import ACCOUNTANT_DEFAULT_PERMISSIONS, OPERATOR_DEFAULT_PERMISSIONS
from modules.user.types.user_types import LoginMethod, Permission, Role, Title, UserStatus
from seeds.types.seed_types import ClientSeed, SiteSeed, UserSeed


SITE_OUJDA_ID = "7d1c2a4e-1f0b-4a51-9c39-1a2b3c4d5e01"

SITE_BERKANE_ID = "7d1c2a4e-1f0b-4a51-9c39-1a2b3c4d5e02"

SEASON_ID = "5e450000-2627-4000-8000-000000000001"

SEASON_CODE = "2627"

SEASON_LABEL = "Saison 2026-2027"

SEASON_STARTS_ON = date(2026, 11, 1)

ALL_PERMISSIONS: tuple[Permission, ...] = tuple(Permission)

SITES: tuple[SiteSeed, ...] = (
    SiteSeed(SITE_OUJDA_ID, "OJ", "AMANA OLIVE D’ORIENT", "oujda-angad", "Oujda", "Route de Taza, km 5"),
    SiteSeed(SITE_BERKANE_ID, "BK", "Huilerie Berkane", "berkane", "Berkane", "Route de Saïdia"),
)

CLIENTS: tuple[ClientSeed, ...] = (
    ClientSeed("c5b2d7f3-0002-4d2f-8c2b-000000000001", ClientKind.INDIVIDUAL, "+212662300001", "oujda-angad", "Oujda", "Hay Al Qods", SITE_OUJDA_ID, Title.MR, "Driss", "El Ouafi"),
    ClientSeed("c5b2d7f3-0002-4d2f-8c2b-000000000002", ClientKind.COMPANY, "+212536610200", "berkane", "Berkane", "Zone industrielle", SITE_BERKANE_ID, legal_name="Coopérative Zitoune"),
    ClientSeed("c5b2d7f3-0002-4d2f-8c2b-000000000003", ClientKind.INDIVIDUAL, "+212662300002", "berkane", "Ahfir", "Douar Laarbaa", SITE_BERKANE_ID, Title.MR, "Youssef", "Kaddouri"),
)

COMPANY_CONTACT_JOB_TITLE = "Gérante"

BOTH_SITES_ALL = {SITE_OUJDA_ID: ALL_PERMISSIONS, SITE_BERKANE_ID: ALL_PERMISSIONS}

USERS: tuple[UserSeed, ...] = (
    UserSeed("a3f1c6e2-0001-4c1e-9b1a-000000000001", Role.MANAGEMENT, "Mohammed", "Taibi", (LoginMethod.EMAIL_PASSWORD, LoginMethod.PHONE_PIN), Title.DR, "+212661100001", "m.taibi@oleoziza.ma", "1234", "Oleoziza2026", is_owner=True, permissions_by_site=BOTH_SITES_ALL),
    UserSeed("a3f1c6e2-0001-4c1e-9b1a-000000000002", Role.MANAGEMENT, "Oualid Mohammed", "Taibi", (LoginMethod.EMAIL_PASSWORD,), Title.MR, "+212661100002", "o.taibi@oleoziza.ma", password="Oleoziza2026", is_owner=True, permissions_by_site=BOTH_SITES_ALL),
    UserSeed(
        "a3f1c6e2-0001-4c1e-9b1a-000000000003", Role.MANAGEMENT, "Nadia", "Boukili", (LoginMethod.EMAIL_PASSWORD,), Title.MRS, "+212661100003", "n.boukili@oleoziza.ma", password="Berkane2026",
        permissions_by_site={SITE_BERKANE_ID: ALL_PERMISSIONS, SITE_OUJDA_ID: tuple(permission for permission in ALL_PERMISSIONS if permission != Permission.FINANCE_VIEW)},
    ),
    UserSeed("a3f1c6e2-0001-4c1e-9b1a-000000000004", Role.OPERATOR, "Hamid", "Zerrouki", (LoginMethod.PHONE_PIN,), phone="+212661200001", pin="1111", province_id="oujda-angad", city="Oujda", address="14, Hay Al Andalous", permissions_by_site={SITE_OUJDA_ID: OPERATOR_DEFAULT_PERMISSIONS}),
    UserSeed("a3f1c6e2-0001-4c1e-9b1a-000000000005", Role.OPERATOR, "Abdelkader", "Mansouri", (LoginMethod.PHONE_PIN,), phone="+212661200002", pin="2222", must_change_credential=True, province_id="berkane", city="Berkane", address="7, Avenue Hassan II", permissions_by_site={SITE_BERKANE_ID: OPERATOR_DEFAULT_PERMISSIONS}),
    UserSeed("b7e2d1f4-0002-4c1e-9b1a-000000000006", Role.ACCOUNTANT, "Khadija", "Amrani", (LoginMethod.EMAIL_PASSWORD,), Title.MRS, "+212661100006", "k.amrani@oleoziza.ma", password="Finances2026", permissions_by_site={SITE_OUJDA_ID: ACCOUNTANT_DEFAULT_PERMISSIONS, SITE_BERKANE_ID: ACCOUNTANT_DEFAULT_PERMISSIONS}),
    UserSeed(
        "b7e2d1f4-0002-4c1e-9b1a-000000000007", Role.MANAGEMENT, "Hicham", "Berrada", (LoginMethod.EMAIL_PASSWORD, LoginMethod.PHONE_OTP), Title.MR, "+212661100007", "h.berrada@oleoziza.ma", password="Oujda2026",
        permissions_by_site={SITE_OUJDA_ID: tuple(permission for permission in ALL_PERMISSIONS if permission not in (Permission.USER_MANAGE, Permission.SITE_MANAGE, Permission.SEASON_MANAGE))},
    ),
    UserSeed("b7e2d1f4-0002-4c1e-9b1a-000000000008", Role.OPERATOR, "Soufiane", "Mrabet", (LoginMethod.PHONE_PIN,), phone="+212661200008", pin="1234", province_id="oujda-angad", city="Bni Drar", address="Douar Ouled Ali", permissions_by_site={SITE_OUJDA_ID: (*OPERATOR_DEFAULT_PERMISSIONS, Permission.FINANCE_VIEW, Permission.PAYMENT_CONFIRM)}),
    UserSeed(
        "b7e2d1f4-0002-4c1e-9b1a-000000000009", Role.OPERATOR, "Samir", "Kaddouri", (LoginMethod.PHONE_PIN, LoginMethod.PHONE_OTP), phone="+212661200009", pin="1234",
        permissions_by_site={SITE_OUJDA_ID: OPERATOR_DEFAULT_PERMISSIONS, SITE_BERKANE_ID: tuple(permission for permission in OPERATOR_DEFAULT_PERMISSIONS if permission != Permission.PURCHASE_CREATE)},
    ),
    UserSeed("b7e2d1f4-0002-4c1e-9b1a-000000000010", Role.OPERATOR, "Rachid", "Bennani", (LoginMethod.PHONE_PIN,), phone="+212661200010", status=UserStatus.INVITED, permissions_by_site={SITE_OUJDA_ID: OPERATOR_DEFAULT_PERMISSIONS}),
    UserSeed("b7e2d1f4-0002-4c1e-9b1a-000000000011", Role.OPERATOR, "Imane", "Saidi", (LoginMethod.PHONE_PIN,), phone="+212661200011", pin="1234", permissions_by_site={SITE_OUJDA_ID: OPERATOR_DEFAULT_PERMISSIONS}),
    UserSeed("b7e2d1f4-0002-4c1e-9b1a-000000000012", Role.OPERATOR, "Mustapha", "Ziani", (LoginMethod.PHONE_PIN,), phone="+212661200012", pin="1234", permissions_by_site={SITE_BERKANE_ID: OPERATOR_DEFAULT_PERMISSIONS}),
    UserSeed("b7e2d1f4-0002-4c1e-9b1a-000000000013", Role.OPERATOR, "Yassine", "Lahlou", (LoginMethod.PHONE_PIN,), phone="+212661200013", pin="1234", status=UserStatus.DISABLED, permissions_by_site={SITE_BERKANE_ID: OPERATOR_DEFAULT_PERMISSIONS}),
    UserSeed("a3f1c6e2-0001-4c1e-9b1a-000000000006", Role.CLIENT, "Driss", "El Ouafi", (LoginMethod.PHONE_PIN, LoginMethod.PHONE_OTP), Title.MR, "+212662300001", client_id="c5b2d7f3-0002-4d2f-8c2b-000000000001"),
    UserSeed("a3f1c6e2-0001-4c1e-9b1a-000000000007", Role.CLIENT, "Latifa", "Hamdaoui", (LoginMethod.EMAIL_PASSWORD,), Title.MRS, email="l.hamdaoui@zitoune-berkane.ma", password="Zitoune2026", must_change_credential=True, client_id="c5b2d7f3-0002-4d2f-8c2b-000000000002", is_client_contact=True),
    UserSeed("a3f1c6e2-0001-4c1e-9b1a-000000000008", Role.CLIENT, "Youssef", "Kaddouri", (LoginMethod.PHONE_PIN, LoginMethod.PHONE_OTP), Title.MR, "+212662300002", status=UserStatus.INVITED, client_id="c5b2d7f3-0002-4d2f-8c2b-000000000003"),
)
