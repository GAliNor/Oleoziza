from datetime import date, datetime, timezone
from decimal import Decimal
from io import BytesIO
from uuid import UUID, uuid4

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
from modules.file.models.file_models import File
from modules.file.types.file_types import FileBucket
from modules.site.constants.site_constants import ILLUSTRATION_EXTENSION_BY_CONTENT_TYPE, MAX_ILLUSTRATION_SIZE_IN_BYTES
from modules.site.models.site_models import Season, Site
from modules.site.types.site_types import SeasonArtVariant, SeasonOut, SeasonStatus, SiteStatus
from modules.user.types.user_types import Permission


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
        return [self._build_season(season) for season in seasons]

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
        self._check_can_manage()
        season = self._get_season(season_id)
        extension = ILLUSTRATION_EXTENSION_BY_CONTENT_TYPE.get(upload.content_type or "")
        if extension is None:
            raise RefusedError("unsupported_type", 415)
        content = upload.file.read(MAX_ILLUSTRATION_SIZE_IN_BYTES + 1)
        if len(content) > MAX_ILLUSTRATION_SIZE_IN_BYTES:
            raise RefusedError("too_large", 413)
        storage_key = f"seasons/{season.code}/{variant.value}-{uuid4().hex}.{extension}"
        self.storage.upload_object(storage_key, BytesIO(content), upload.content_type or "", is_private=False)
        file = File(bucket=FileBucket.PUBLIC, storage_key=storage_key, original_name=upload.filename or storage_key, content_type=upload.content_type or "", size_in_bytes=len(content), created_by_id=self.current_user.id)
        self.db.add(file)
        self.db.flush()
        if variant == SeasonArtVariant.DARK:
            season.illustration_dark_file_id = file.id
        else:
            season.illustration_file_id = file.id
        season.updated_by_id = self.current_user.id
        record_audit_event(self.db, self.current_user.id, "season.illustration_set", entity_type="season", entity_id=season.id, after={"variant": variant.value, "fileId": str(file.id)})
        self.db.commit()
        return self._build_season(season)

    def _build_season(self, season: Season) -> SeasonOut:
        """
        Shape a Season for the front, with the public URLs of its banners when they exist.

        Args:
            season (Season): Season to show.

        Returns:
            SeasonOut: The Season.
        """
        season_out = SeasonOut.model_validate(season, from_attributes=True)
        season_out.illustration_url = self._build_file_url(season.illustration_file_id)
        season_out.illustration_dark_url = self._build_file_url(season.illustration_dark_file_id)
        return season_out

    def _build_file_url(self, file_id: UUID | None) -> str | None:
        """
        Give the public URL of a stored banner.

        Args:
            file_id (UUID | None): File id, or None when no banner was uploaded.

        Returns:
            str | None: Public URL, or None.
        """
        file = self.db.get(File, file_id) if file_id else None
        return self.storage.build_public_url(file.storage_key) if file else None

    def prepare_next_season(self) -> SeasonOut:
        """
        Prepare the Season after the latest one, November to January, with each Site's prices carried over from the Season under way, or the latest one when none is open.

        Returns:
            SeasonOut: The planned Season.

        Raises:
            RefusedError: season_forbidden without season.manage, season_already_planned when one is already prepared.
        """
        self._check_can_manage()
        if self.db.scalar(select(Season.id).where(Season.status == SeasonStatus.PLANNED)) is not None:
            raise RefusedError("season_already_planned")
        latest = self.db.scalar(select(Season).order_by(Season.starts_on.desc(), Season.created_at.desc()).limit(1))
        source = self.db.scalar(select(Season).where(Season.status == SeasonStatus.OPEN)) or latest
        start_year = latest.starts_on.year + 1 if latest else datetime.now(timezone.utc).year
        season = Season(
            code=f"{start_year % 100:02d}{(start_year + 1) % 100:02d}",
            label=f"Saison {start_year}-{start_year + 1}",
            starts_on=date(start_year, SEASON_START_MONTH, SEASON_START_DAY),
            ends_on=date(start_year + 1, SEASON_END_MONTH, SEASON_END_DAY),
            status=SeasonStatus.PLANNED,
            created_by_id=self.current_user.id,
        )
        self.db.add(season)
        self.db.flush()
        if source is not None:
            self._carry_prices_over(source, season)
        record_audit_event(self.db, self.current_user.id, "season.prepared", entity_type="season", entity_id=season.id, after={"code": season.code})
        self.db.commit()
        return self._build_season(season)

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
        self._check_can_manage()
        season = self._get_season(season_id)
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
        return self._build_season(season)

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
        self._check_can_manage()
        season = self._get_season(season_id)
        if season.status != SeasonStatus.OPEN:
            raise RefusedError("season_not_open")
        self._close(season)
        self.db.commit()
        return self._build_season(season)

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
                    .order_by(SiteSetting.effective_from.desc())
                    .limit(1)
                )
                if value is not None:
                    self.db.add(SiteSetting(site_id=site_id, season_id=season.id, key=key, value=value, effective_from=effective_from, created_by_id=self.current_user.id))

    def _get_season(self, season_id: UUID) -> Season:
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

    def _check_can_manage(self) -> None:
        """
        Refuse a User without season.manage on any Site; the Owner always may.

        Raises:
            RefusedError: season_forbidden.
        """
        permission = Permission.SEASON_MANAGE.value
        if not self.current_user.is_owner and not any(permission in permissions for permissions in self.current_user.permissions_by_site.values()):
            raise RefusedError("season_forbidden", 403)


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
