from uuid import UUID

from fastapi import APIRouter, Depends, Query

from modules.client.services.client_services import ClientService, get_client_service
from modules.client.types.client_types import ClientAccountOut, ClientContactIn, ClientCreateIn, ClientLotLineOut, ClientOut, ClientRecordOut


router = APIRouter(prefix="/clients", tags=["client"])


@router.get("", response_model=list[ClientOut])
def list_clients(client_service: ClientService = Depends(get_client_service)) -> list[ClientOut]:
    """
    List every Client, shared by all Sites, for the pickers and the search.

    Args:
        client_service (ClientService): Injected client service.

    Returns:
        list[ClientOut]: The Clients.
    """
    return client_service.list_clients()


@router.get("/records", response_model=list[ClientRecordOut])
def list_records(client_service: ClientService = Depends(get_client_service)) -> list[ClientRecordOut]:
    """
    List the Clients with their figures and Lots for Management's register (client.view).

    Args:
        client_service (ClientService): Injected client service.

    Returns:
        list[ClientRecordOut]: The register.
    """
    return client_service.list_records()


@router.post("", response_model=ClientOut)
def create_client(payload: ClientCreateIn, client_service: ClientService = Depends(get_client_service)) -> ClientOut:
    """
    Add a Client; a replay of the same id answers the Client already saved.

    Args:
        payload (ClientCreateIn): The Client as typed.
        client_service (ClientService): Injected client service.

    Returns:
        ClientOut: The Client as saved.
    """
    return client_service.create_client(payload)


@router.get("/{client_id}/account", response_model=ClientAccountOut)
def get_account(client_id: UUID, client_service: ClientService = Depends(get_client_service)) -> ClientAccountOut:
    """
    Read what a Client holds and owes now.

    Args:
        client_id (UUID): Client to read.
        client_service (ClientService): Injected client service.

    Returns:
        ClientAccountOut: The account.
    """
    return client_service.get_account(client_id)


@router.get("/{client_id}/history", response_model=list[ClientLotLineOut])
def list_history(client_id: UUID, site_id: UUID = Query(alias="siteId"), client_service: ClientService = Depends(get_client_service)) -> list[ClientLotLineOut]:
    """
    List a Client's past Lots on one Site.

    Args:
        client_id (UUID): Client to read.
        site_id (UUID): Site of the Lots.
        client_service (ClientService): Injected client service.

    Returns:
        list[ClientLotLineOut]: The Lots, newest first.
    """
    return client_service.list_history(client_id, site_id)


@router.patch("/{client_id}/contact", response_model=ClientOut)
def update_contact(client_id: UUID, payload: ClientContactIn, client_service: ClientService = Depends(get_client_service)) -> ClientOut:
    """
    Change a Client's phone or email (client.edit).

    Args:
        client_id (UUID): Client to change.
        payload (ClientContactIn): New phone and/or email.
        client_service (ClientService): Injected client service.

    Returns:
        ClientOut: The Client as saved.
    """
    return client_service.update_contact(client_id, payload)
