from io import BytesIO
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.file.models.file_models import File
from modules.file.types.file_types import FileBucket
from modules.site.models.site_models import Season
from modules.site.types.site_types import SeasonArtVariant


def store_season_illustration(
    db: Session,
    storage: RustFSClient,
    season: Season,
    variant: SeasonArtVariant,
    content: bytes,
    content_type: str,
    extension: str,
    original_name: str,
    actor_id: UUID | None,
) -> File:
    """
    Put a Season banner in the public bucket under the Season's code, record it as a File and attach it to the Season, in the caller's transaction.

    Args:
        db (Session): Session of the change.
        storage (RustFSClient): RustFS client.
        season (Season): Season illustrated.
        variant (SeasonArtVariant): light or dark.
        content (bytes): Image bytes.
        content_type (str): Image MIME type.
        extension (str): File extension matching the type.
        original_name (str): Name the image was uploaded with.
        actor_id (UUID | None): User uploading it, None for the seed.

    Returns:
        File: The stored File, added but not committed.

    Raises:
        StorageError: If RustFS refused or could not be reached.
    """
    storage_key = f"seasons/{season.code}/{variant.value}-{uuid4().hex}.{extension}"
    storage.upload_object(storage_key, BytesIO(content), content_type, is_private=False)
    file = File(bucket=FileBucket.PUBLIC, storage_key=storage_key, original_name=original_name, content_type=content_type, size_in_bytes=len(content), created_by_id=actor_id)
    db.add(file)
    db.flush()
    if variant == SeasonArtVariant.DARK:
        season.illustration_dark_file_id = file.id
    else:
        season.illustration_file_id = file.id
    season.updated_by_id = actor_id
    return file
