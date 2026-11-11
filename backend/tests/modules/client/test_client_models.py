from modules.client.models.client_models import Client
from modules.client.types.client_types import ClientKind
from modules.user.types.user_types import Title
from tests.model_helpers import get_check_names, get_registered_table, get_registered_table_names


def test_client_tables_are_registered() -> None:
    """
    The Client and Client Contact tables register on the app's metadata.
    """
    assert {"clients", "client_contacts"} <= get_registered_table_names()


def test_each_client_kind_carries_its_own_names() -> None:
    """
    An Individual needs first and last names, a Company a legal name.
    """
    check_names = get_check_names("clients")

    assert "ck_clients_individual_has_names" in check_names
    assert "ck_clients_company_has_legal_name" in check_names


def test_client_phone_and_location_are_required_and_records_offline_entry() -> None:
    """
    A Client has a phone and a place in the Oriental, and keeps the trace of an offline creation.
    """
    clients = get_registered_table("clients")

    assert clients.c.phone.nullable is False
    assert clients.c.province_id.nullable is False
    assert clients.c.entered_at.nullable is False
    assert clients.c.was_recorded_offline.nullable is False


def test_identifiers_have_english_names() -> None:
    """
    The Moroccan CIN and ICE are stored under English column names.
    """
    client_columns = set(get_registered_table("clients").c.keys())

    assert {"national_id_number", "company_identifier"} <= client_columns
    assert not {"cin", "ice"} & client_columns


def test_display_name_reads_the_kind() -> None:
    """
    The display name is the legal name of a Company, or the title and names of an Individual.
    """
    company = Client(kind=ClientKind.COMPANY, legal_name="Coopérative Angad")
    individual = Client(kind=ClientKind.INDIVIDUAL, title=Title.HAJJ, first_name="Mohammed", last_name="Benali")

    assert company.display_name == "Coopérative Angad"
    assert individual.display_name == "Hajj Mohammed Benali"
