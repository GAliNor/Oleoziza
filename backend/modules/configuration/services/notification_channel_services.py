from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.configuration.business.notification_channels import build_notification_channel_views
from modules.configuration.constants.configuration_constants import IMPLEMENTED_NOTIFICATION_CHANNELS
from modules.configuration.models.configuration_models import NotificationChannelSetting
from modules.configuration.types.configuration_types import NotificationChannel, NotificationChannelOut, NotificationChannelUpdateIn
from modules.site.models.site_models import Site
from modules.user.types.user_types import Permission


NOTIFICATION_CHANNEL_CHANGED_ACTION = "notification_channel.changed"


class NotificationChannelService:
    """
    The company's Notification Channels: which ones the mill may message Clients through.
    """

    def __init__(self, db: Session, current_user: CurrentUser) -> None:
        """
        Bind the service to a session and the signed-in User.

        Args:
            db (Session): Request-scoped session.
            current_user (CurrentUser): User from the access token.
        """
        self.db = db
        self.current_user = current_user

    def list_channels(self) -> list[NotificationChannelOut]:
        """
        Read every Notification Channel with whether it is implemented and enabled; any signed-in staff member may read them.

        Returns:
            list[NotificationChannelOut]: WhatsApp, SMS and email.
        """
        return build_notification_channel_views(self.db)

    def update_channel(self, channel: NotificationChannel, payload: NotificationChannelUpdateIn) -> list[NotificationChannelOut]:
        """
        Switch one channel on or off for every Site, recorded in the Audit Trail.

        Args:
            channel (NotificationChannel): Channel to switch.
            payload (NotificationChannelUpdateIn): On or off.

        Returns:
            list[NotificationChannelOut]: Every channel after the change.

        Raises:
            RefusedError: configuration_forbidden without the right on every Site, notification_channel_not_implemented when switching on a channel the mill can't send through.
        """
        self._check_manages_every_site()
        if payload.is_enabled and channel not in IMPLEMENTED_NOTIFICATION_CHANNELS:
            raise RefusedError("notification_channel_not_implemented")
        setting = self.db.get(NotificationChannelSetting, channel)
        was_enabled = bool(setting and setting.is_enabled)
        if setting is None:
            setting = NotificationChannelSetting(channel=channel, created_by_id=self.current_user.id)
            self.db.add(setting)
        setting.is_enabled = payload.is_enabled
        setting.updated_by_id = self.current_user.id
        if was_enabled != payload.is_enabled:
            record_audit_event(self.db, self.current_user.id, NOTIFICATION_CHANNEL_CHANGED_ACTION, entity_type="notification_channel", before={"channel": channel.value, "is_enabled": was_enabled}, after={"channel": channel.value, "is_enabled": payload.is_enabled})
        self.db.commit()
        return build_notification_channel_views(self.db)

    def _check_manages_every_site(self) -> None:
        """
        A company setting needs the Owner, or the right to manage the configuration on every Site.

        Raises:
            RefusedError: configuration_forbidden otherwise.
        """
        if self.current_user.is_owner:
            return
        site_ids = list(self.db.scalars(select(Site.id)))
        if not site_ids or not all(self.current_user.has_permission(site_id, Permission.CONFIGURATION_MANAGE) for site_id in site_ids):
            raise RefusedError("configuration_forbidden", 403)


def get_notification_channel_service(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)) -> NotificationChannelService:
    """
    Build the Notification Channel service for one request.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.

    Returns:
        NotificationChannelService: Service bound to the session and actor.
    """
    return NotificationChannelService(db, current_user)
