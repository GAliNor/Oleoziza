from io import BytesIO
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.file.models.file_models import File
from modules.file.types.file_types import FileBucket
from modules.site.models.site_models import Season, SeasonIllustration
from modules.site.types.site_types import SeasonArtVariant, SeasonIllustrationOut


def store_illustration_image(
    db: Session,
    storage: RustFSClient,
    code: str,
    variant: SeasonArtVariant,
    content: bytes,
    content_type: str,
    extension: str,
    original_name: str,
    actor_id: UUID | None,
) -> File:
    """
    Put one picture of a Season Illustration in the public bucket under the Illustration's code and record it as a File, in the caller's transaction.

    Args:
        db (Session): Session of the change.
        storage (RustFSClient): RustFS client.
        code (str): Code of the Season Illustration.
        variant (SeasonArtVariant): light or dark.
        content (bytes): Image bytes.
        content_type (str): Image MIME type.
        extension (str): File extension matching the type.
        original_name (str): Name of the image file.
        actor_id (UUID | None): User storing it, None for a seed.

    Returns:
        File: The stored File, added and flushed but not committed.

    Raises:
        StorageError: If RustFS refused or could not be reached.
    """
    storage_key = f"seasons/{code}/{variant.value}-{uuid4().hex}.{extension}"
    storage.upload_object(storage_key, BytesIO(content), content_type, is_private=False)
    file = File(bucket=FileBucket.PUBLIC, storage_key=storage_key, original_name=original_name, content_type=content_type, size_in_bytes=len(content), created_by_id=actor_id)
    db.add(file)
    db.flush()
    return file


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
    Upload one picture for a Season into the Season Illustration named after the Season's code (created with that picture for both versions when missing, otherwise only that version replaced), and make the Season use it.

    Args:
        db (Session): Session of the change.
        storage (RustFSClient): RustFS client.
        season (Season): Season illustrated.
        variant (SeasonArtVariant): light or dark.
        content (bytes): Image bytes.
        content_type (str): Image MIME type.
        extension (str): File extension matching the type.
        original_name (str): Name the image was uploaded with.
        actor_id (UUID | None): User uploading it.

    Returns:
        File: The stored File, added but not committed.

    Raises:
        StorageError: If RustFS refused or could not be reached.
    """
    file = store_illustration_image(db, storage, season.code, variant, content, content_type, extension, original_name, actor_id)
    illustration = db.scalar(select(SeasonIllustration).where(SeasonIllustration.code == season.code))
    if illustration is None:
        illustration = SeasonIllustration(code=season.code, light_file_id=file.id, dark_file_id=file.id, created_by_id=actor_id)
        db.add(illustration)
        db.flush()
    elif variant == SeasonArtVariant.DARK:
        illustration.dark_file_id = file.id
        illustration.updated_by_id = actor_id
    else:
        illustration.light_file_id = file.id
        illustration.updated_by_id = actor_id
    season.season_illustration_id = illustration.id
    season.updated_by_id = actor_id
    return file


def read_season_illustrations(db: Session, storage: RustFSClient, illustration_ids: set[UUID] | None = None) -> dict[UUID, SeasonIllustrationOut]:
    """
    Read Season Illustrations with the public URLs of their two pictures, in one query.

    Args:
        db (Session): Session to read with.
        storage (RustFSClient): RustFS client, which builds the public URLs.
        illustration_ids (set[UUID] | None): Season Illustrations wanted, None for every one.

    Returns:
        dict[UUID, SeasonIllustrationOut]: Season Illustrations by id, newest code first.
    """
    if illustration_ids is not None and not illustration_ids:
        return {}
    light_file = aliased(File)
    dark_file = aliased(File)
    query = (
        select(SeasonIllustration.id, SeasonIllustration.code, light_file.storage_key, dark_file.storage_key)
        .join(light_file, light_file.id == SeasonIllustration.light_file_id)
        .join(dark_file, dark_file.id == SeasonIllustration.dark_file_id)
        .order_by(SeasonIllustration.code.desc())
    )
    if illustration_ids is not None:
        query = query.where(SeasonIllustration.id.in_(illustration_ids))
    return {
        illustration_id: SeasonIllustrationOut(id=illustration_id, code=code, illustration_url=storage.build_public_url(light_key), illustration_dark_url=storage.build_public_url(dark_key))
        for illustration_id, code, light_key, dark_key in db.execute(query)
    }
