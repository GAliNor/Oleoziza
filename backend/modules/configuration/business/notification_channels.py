from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.configuration.constants.configuration_constants import IMPLEMENTED_NOTIFICATION_CHANNELS, NOTIFICATION_CHANNEL_ORDER
from modules.configuration.models.configuration_models import NotificationChannelSetting
from modules.configuration.types.configuration_types import NotificationChannel, NotificationChannelOut


def list_switched_on_channels(db: Session) -> set[NotificationChannel]:
    """
    Read the Notification Channels Management switched on; a channel without a row is off.

    Args:
        db (Session): Session to read with.

    Returns:
        set[NotificationChannel]: Channels switched on, implemented or not.
    """
    return set(db.scalars(select(NotificationChannelSetting.channel).where(NotificationChannelSetting.is_enabled.is_(True))))


def list_enabled_notification_channels(db: Session) -> set[NotificationChannel]:
    """
    Read the channels the mill may message Clients through now: switched on by Management and implemented in the code.

    Args:
        db (Session): Session to read with.

    Returns:
        set[NotificationChannel]: Channels a Lot notification may use.
    """
    return list_switched_on_channels(db) & IMPLEMENTED_NOTIFICATION_CHANNELS


def build_notification_channel_views(db: Session) -> list[NotificationChannelOut]:
    """
    Shape every Notification Channel for Configuration and Reception, in the fixed order WhatsApp, SMS, email.

    Args:
        db (Session): Session to read with.

    Returns:
        list[NotificationChannelOut]: One line per channel; a channel not implemented is never shown as enabled.
    """
    enabled = list_enabled_notification_channels(db)
    return [NotificationChannelOut(channel=channel, is_implemented=channel in IMPLEMENTED_NOTIFICATION_CHANNELS, is_enabled=channel in enabled) for channel in NOTIFICATION_CHANNEL_ORDER]
