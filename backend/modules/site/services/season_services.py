from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import Depends, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import RefusedError
from core.helpers import get_local_midnight
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.audit.business.audit_events import record_audit_event
from modules.configuration.models.configuration_models import SiteSetting
from modules.configuration.types.configuration_types import SettingKey
from modules.site.business.season_art import read_season_illustrations, store_season_illustration
from modules.site.constants.site_constants import ILLUSTRATION_EXTENSION_BY_CONTENT_TYPE, MAX_ILLUSTRATION_SIZE_IN_BYTES
from modules.site.models.site_models import Season, SeasonIllustration, Site
from modules.site.types.site_types import SeasonArtVariant, SeasonIllustrationOut, SeasonOut, SeasonStatus, SiteStatus
from modules.user.types.user_types import Permission


FIRST_HARVEST_MONTH = 7

SEASON_START_MONTH = 11

SEASON_START_DAY = 1

SEASON_END_MONTH = 1

SEASON_END_DAY = 31

SEASON_PRICE_KEYS = (SettingKey.MILLING_RATE_PER_KG, SettingKey.DISCOUNT_LIMIT_PERCENT, SettingKey.OIL_PRICE_PER_LITRE)


class SeasonService:
    def __init__(self, db: Session, current_user: CurrentUser, storage: RustFSClient) -> None:
        """
        Keep the session, the User preparing, opening or closing Seasons, and the storage holding their illustrations.

        Args:
            db (Session): Request-scoped database session.
            current_user (CurrentUser): Signed-in User.
            storage (RustFSClient): RustFS client, for the Season banners.
        """
        self.db = db
        self.current_user = current_user
        self.storage = storage

    def list_seasons(self) -> list[SeasonOut]:
        """
        List every Season, oldest first.

        Returns:
            list[SeasonOut]: The Seasons.
        """
        seasons = self.db.scalars(select(Season).order_by(Season.starts_on)).all()
        illustrations = read_season_illustrations(self.db, self.storage, {season.season_illustration_id for season in seasons if season.season_illustration_id})
        return [self.build_season(season, illustrations) for season in seasons]

    def choose_illustration(self, season_id: UUID, season_illustration_id: UUID | None) -> SeasonOut:
        """
        Make a Season use one of the available Season Illustrations, or none, which brings back the drawn sketch.

        Args:
            season_id (UUID): Season illustrated.
            season_illustration_id (UUID | None): Season Illustration picked, None for none.

        Returns:
            SeasonOut: The Season with its banner URLs.

        Raises:
            RefusedError: season_forbidden, season_not_found, season_illustration_not_found.
        """
        self.check_can_manage()
        season = self.get_season_row(season_id)
        self._check_illustration_exists(season_illustration_id)
        season.season_illustration_id = season_illustration_id
        season.updated_by_id = self.current_user.id
        after = {"seasonIllustrationId": str(season_illustration_id) if season_illustration_id else None}
        record_audit_event(self.db, self.current_user.id, "season.illustration_chosen", entity_type="season", entity_id=season.id, after=after)
        self.db.commit()
        return self.build_season(season)

    def upload_illustration(self, season_id: UUID, variant: SeasonArtVariant, upload: UploadFile) -> SeasonOut:
        """
        Store a Season's banner (daylight, or dusk for dark mode) in the public bucket and attach it to the Season.

        Args:
            season_id (UUID): Season illustrated.
            variant (SeasonArtVariant): light or dark.
            upload (UploadFile): WebP, PNG or JPEG image.

        Returns:
            SeasonOut: The Season with its banner URLs.

        Raises:
            RefusedError: season_forbidden, season_not_found, unsupported_type, too_large.
            StorageError: If RustFS refused or could not be reached.
        """
        self.check_can_manage()
        season = self.get_season_row(season_id)
        extension = ILLUSTRATION_EXTENSION_BY_CONTENT_TYPE.get(upload.content_type or "")
        if extension is None:
            raise RefusedError("unsupported_type", 415)
        content = upload.file.read(MAX_ILLUSTRATION_SIZE_IN_BYTES + 1)
        if len(content) > MAX_ILLUSTRATION_SIZE_IN_BYTES:
            raise RefusedError("too_large", 413)
        file = store_season_illustration(self.db, self.storage, season, variant, content, upload.content_type or "", extension, upload.filename or f"{season.code}.{extension}", self.current_user.id)
        record_audit_event(self.db, self.current_user.id, "season.illustration_set", entity_type="season", entity_id=season.id, after={"variant": variant.value, "fileId": str(file.id)})
        self.db.commit()
        return self.build_season(season)

    def build_season(self, season: Season, illustrations: dict[UUID, SeasonIllustrationOut] | None = None) -> SeasonOut:
        """
        Shape a Season for the front, with the public URLs of its Season Illustration when it uses one.

        Args:
            season (Season): Season to show.
            illustrations (dict[UUID, SeasonIllustrationOut] | None): Season Illustrations already read for a list; read for this Season alone when None.

        Returns:
            SeasonOut: The Season.
        """
        if illustrations is None:
            illustrations = read_season_illustrations(self.db, self.storage, {season.season_illustration_id} if season.season_illustration_id else set())
        season_out = SeasonOut.model_validate(season, from_attributes=True)
        illustration = illustrations.get(season.season_illustration_id) if season.season_illustration_id else None
        if illustration is not None:
            season_out.illustration_url = illustration.illustration_url
            season_out.illustration_dark_url = illustration.illustration_dark_url
        return season_out

    def prepare_next_season(self, season_illustration_id: UUID | None = None) -> SeasonOut:
        """
        Prepare the Season after the latest one, November to January, using the Season Illustration picked, with each Site's prices carried over from the Season under way, or the latest one when none is open.

        Args:
            season_illustration_id (UUID | None): Season Illustration the new Season uses, None for the drawn sketch.

        Returns:
            SeasonOut: The planned Season.

        Raises:
            RefusedError: season_forbidden without season.manage, season_already_planned when one is already prepared, season_illustration_not_found.
        """
        self.check_can_manage()
        self._check_illustration_exists(season_illustration_id)
        if self.db.scalar(select(Season.id).where(Season.status == SeasonStatus.PLANNED)) is not None:
            raise RefusedError("season_already_planned")
        latest = self.db.scalar(select(Season).order_by(Season.starts_on.desc(), Season.created_at.desc()).limit(1))
        source = self.db.scalar(select(Season).where(Season.status == SeasonStatus.OPEN)) or latest
        start_year = get_harvest_year(latest.starts_on) + 1 if latest else datetime.now(timezone.utc).year
        season = Season(
            code=f"{start_year % 100:02d}{(start_year + 1) % 100:02d}",
            label=f"Saison {start_year}-{start_year + 1}",
            starts_on=date(start_year, SEASON_START_MONTH, SEASON_START_DAY),
            ends_on=date(start_year + 1, SEASON_END_MONTH, SEASON_END_DAY),
            status=SeasonStatus.PLANNED,
            season_illustration_id=season_illustration_id,
            created_by_id=self.current_user.id,
        )
        self.db.add(season)
        self.db.flush()
        if source is not None:
            self._carry_prices_over(source, season)
        record_audit_event(self.db, self.current_user.id, "season.prepared", entity_type="season", entity_id=season.id, after={"code": season.code})
        self.db.commit()
        return self.build_season(season)

    def open_season(self, season_id: UUID) -> SeasonOut:
        """
        Open a prepared Season; the Season under way, if any, is closed at the same moment.

        Args:
            season_id (UUID): Planned Season to open.

        Returns:
            SeasonOut: The opened Season.

        Raises:
            RefusedError: season_forbidden, season_not_found, season_not_planned.
        """
        self.check_can_manage()
        season = self.get_season_row(season_id)
        if season.status != SeasonStatus.PLANNED:
            raise RefusedError("season_not_planned")
        current = self.db.scalar(select(Season).where(Season.status == SeasonStatus.OPEN))
        if current is not None:
            self._close(current)
            self.db.flush()
        season.status = SeasonStatus.OPEN
        season.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, "season.opened", entity_type="season", entity_id=season.id, after={"code": season.code})
        self.db.commit()
        return self.build_season(season)

    def close_season(self, season_id: UUID) -> SeasonOut:
        """
        Close the Season under way at the end of the harvest.

        Args:
            season_id (UUID): Open Season to close.

        Returns:
            SeasonOut: The closed Season.

        Raises:
            RefusedError: season_forbidden, season_not_found, season_not_open.
        """
        self.check_can_manage()
        season = self.get_season_row(season_id)
        if season.status != SeasonStatus.OPEN:
            raise RefusedError("season_not_open")
        self._close(season)
        self.db.commit()
        return self.build_season(season)

    def _close(self, season: Season) -> None:
        """
        Mark a Season closed now and record it.

        Args:
            season (Season): Season to close.
        """
        season.status = SeasonStatus.CLOSED
        season.closed_at = datetime.now(timezone.utc)
        season.closed_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, "season.closed", entity_type="season", entity_id=season.id, after={"code": season.code})

    def _carry_prices_over(self, previous: Season, season: Season) -> None:
        """
        Give each active Site, in the new Season, the last price it had in the previous one, from the new Season's first day.

        Args:
            previous (Season): Season the prices come from.
            season (Season): New Season.
        """
        effective_from = get_local_midnight(season.starts_on)
        site_ids = self.db.scalars(select(Site.id).where(Site.status == SiteStatus.ACTIVE)).all()
        for site_id in site_ids:
            for key in SEASON_PRICE_KEYS:
                value: Decimal | None = self.db.scalar(
                    select(SiteSetting.value)
                    .where(SiteSetting.site_id == site_id, SiteSetting.season_id == previous.id, SiteSetting.key == key)
                    .order_by(SiteSetting.effective_from.desc(), SiteSetting.id.desc())
                    .limit(1)
                )
                if value is not None:
                    self.db.add(SiteSetting(site_id=site_id, season_id=season.id, key=key, value=value, effective_from=effective_from, created_by_id=self.current_user.id))

    def get_season_row(self, season_id: UUID) -> Season:
        """
        Load a Season or refuse an unknown id.

        Args:
            season_id (UUID): Season id.

        Returns:
            Season: The Season.

        Raises:
            RefusedError: season_not_found.
        """
        season = self.db.get(Season, season_id)
        if season is None:
            raise RefusedError("season_not_found", 404)
        return season

    def _check_illustration_exists(self, season_illustration_id: UUID | None) -> None:
        """
        Refuse a Season Illustration id that names none.

        Args:
            season_illustration_id (UUID | None): Season Illustration picked, None for none.

        Raises:
            RefusedError: season_illustration_not_found.
        """
        if season_illustration_id is not None and self.db.get(SeasonIllustration, season_illustration_id) is None:
            raise RefusedError("season_illustration_not_found", 404)

    def check_can_manage(self) -> None:
        """
        Refuse a User without season.manage on any Site; the Owner always may.

        Raises:
            RefusedError: season_forbidden.
        """
        permission = Permission.SEASON_MANAGE.value
        if not self.current_user.is_owner and not any(permission in permissions for permissions in self.current_user.permissions_by_site.values()):
            raise RefusedError("season_forbidden", 403)


def get_harvest_year(starts_on: date) -> int:
    """
    Read the year a Season is named after, whatever day it was moved to: a harvest starts in autumn, or in the winter that follows.

    Args:
        starts_on (date): First day of the Season.

    Returns:
        int: Its first year, 2026 for « 2026-2027 ».
    """
    return starts_on.year if starts_on.month >= FIRST_HARVEST_MONTH else starts_on.year - 1


def get_season_service(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    storage: RustFSClient = Depends(get_rustfs_client),
) -> SeasonService:
    """
    Build the season service for one request, bound to the signed-in User.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        SeasonService: Service bound to the session, actor and storage.
    """
    return SeasonService(db, current_user, storage)
