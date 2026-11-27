from dataclasses import dataclass, field
from enum import StrEnum

from modules.user.types.user_types import LoginMethod, Permission, Role, Title, UserStatus


class SeedPart(StrEnum):
    """
    The parts of data a seed run can load.
    """

    REFERENCE = "reference"
    ILLUSTRATIONS = "illustrations"
    SITE = "site"
    DEMO = "demo"
    OWNER = "owner"
    AUDIT = "audit"


@dataclass(frozen=True)
class ProvinceSeed:
    """
    One Province of the Oriental with its label position and its towns.
    """

    id: str
    name: str
    is_prefecture: bool
    longitude: str
    latitude: str
    cities: tuple[str, ...]


@dataclass(frozen=True)
class SiteSeed:
    """
    One demo mill, keyed by the id the front mocks use.
    """

    id: str
    code: str
    name: str
    province_id: str
    city: str
    address: str


@dataclass(frozen=True)
class UserSeed:
    """
    One demo User, keyed by the id the front mocks use, with their secrets and Permissions per Site.
    """

    id: str
    role: Role
    first_name: str
    last_name: str
    login_methods: tuple[LoginMethod, ...]
    title: Title | None = None
    phone: str | None = None
    email: str | None = None
    pin: str | None = None
    password: str | None = None
    status: UserStatus = UserStatus.ACTIVE
    is_owner: bool = False
    must_change_credential: bool = False
    permissions_by_site: dict[str, tuple[Permission, ...]] = field(default_factory=dict)


@dataclass(frozen=True)
class AiProviderSeed:
    """
    The AI provider the mill starts with, before an Owner saves its key.
    """

    label: str
    base_url: str


@dataclass(frozen=True)
class AiModelSeed:
    """
    One priced model and the AI Feature it serves by default.
    """

    name: str
    feature: str
    input_price: str
    cached_input_price: str
    output_price: str
    supports_structured_output: bool
