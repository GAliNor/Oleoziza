from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.security import get_current_user
from core.types import CurrentUser
from modules.configuration.services.configuration_services import ConfigurationService, get_configuration_service
from modules.configuration.services.notification_channel_services import NotificationChannelService, get_notification_channel_service
from modules.configuration.types.configuration_types import ConfigurationOut, ConfigurationUpdateIn, NotificationChannel, NotificationChannelOut, NotificationChannelUpdateIn


router = APIRouter(tags=["configuration"])


@router.get("/notification-channels", response_model=list[NotificationChannelOut])
def list_notification_channels(notification_channel_service: NotificationChannelService = Depends(get_notification_channel_service)) -> list[NotificationChannelOut]:
    """
    Read the company's Notification Channels, declared before /{site_id} so the path is not read as a Site.

    Args:
        notification_channel_service (NotificationChannelService): Injected service.

    Returns:
        list[NotificationChannelOut]: WhatsApp, SMS and email with whether each is implemented and enabled.
    """
    return notification_channel_service.list_channels()


@router.put("/notification-channels/{channel}", response_model=list[NotificationChannelOut])
def update_notification_channel(
    channel: NotificationChannel,
    payload: NotificationChannelUpdateIn,
    notification_channel_service: NotificationChannelService = Depends(get_notification_channel_service),
) -> list[NotificationChannelOut]:
    """
    Switch one Notification Channel on or off for every Site.

    Args:
        channel (NotificationChannel): Channel to switch.
        payload (NotificationChannelUpdateIn): On or off.
        notification_channel_service (NotificationChannelService): Injected service.

    Returns:
        list[NotificationChannelOut]: Every channel after the change.
    """
    return notification_channel_service.update_channel(channel, payload)


@router.get("", response_model=list[ConfigurationOut])
def list_configurations(
    site_ids: list[UUID] = Query(default=[], alias="siteId"),
    season_id: UUID | None = Query(default=None, alias="seasonId"),
    current_user: CurrentUser = Depends(get_current_user),
    configuration_service: ConfigurationService = Depends(get_configuration_service),
) -> list[ConfigurationOut]:
    """
    Read several Sites' Configurations for one Season in one request, every Site the caller holds when no siteId is given.

    Args:
        site_ids (list[UUID]): Repeated siteId, possibly none.
        season_id (UUID | None): Season to read, the open one when omitted.
        current_user (CurrentUser): User from the access token.
        configuration_service (ConfigurationService): Injected configuration service.

    Returns:
        list[ConfigurationOut]: One Configuration per Site.
    """
    return configuration_service.list_configurations(site_ids, current_user, season_id)


@router.get("/{site_id}", response_model=ConfigurationOut)
def get_configuration(
    site_id: UUID,
    season_id: UUID | None = Query(default=None, alias="seasonId"),
    current_user: CurrentUser = Depends(get_current_user),
    configuration_service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationOut:
    """
    Read a Site's Configuration: prices of one Season (the open one by default) with their dated changes, Payment Methods, equipment and history.

    Args:
        site_id (UUID): Site to read.
        season_id (UUID | None): Season to read, the open one when omitted.
        current_user (CurrentUser): User from the access token.
        configuration_service (ConfigurationService): Injected configuration service.

    Returns:
        ConfigurationOut: The Configuration.
    """
    return configuration_service.get_configuration(site_id, current_user, season_id)


@router.patch("/{site_id}", response_model=ConfigurationOut)
def update_configuration(
    site_id: UUID,
    payload: ConfigurationUpdateIn,
    current_user: CurrentUser = Depends(get_current_user),
    configuration_service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationOut:
    """
    Apply one change to a Site's Configuration.

    Args:
        site_id (UUID): Site to change.
        payload (ConfigurationUpdateIn): One change with its front-minted id.
        current_user (CurrentUser): User from the access token.
        configuration_service (ConfigurationService): Injected configuration service.

    Returns:
        ConfigurationOut: The Configuration after the change.
    """
    return configuration_service.update_configuration(site_id, payload, current_user)


@router.delete("/{site_id}/price-changes/{change_id}", response_model=ConfigurationOut)
def cancel_price_change(
    site_id: UUID,
    change_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    configuration_service: ConfigurationService = Depends(get_configuration_service),
) -> ConfigurationOut:
    """
    Cancel a scheduled price change before it takes effect.

    Args:
        site_id (UUID): Site of the change.
        change_id (UUID): Scheduled price version.
        current_user (CurrentUser): User from the access token.
        configuration_service (ConfigurationService): Injected configuration service.

    Returns:
        ConfigurationOut: The Configuration of the change's Season.
    """
    return configuration_service.cancel_price_change(site_id, change_id, current_user)
