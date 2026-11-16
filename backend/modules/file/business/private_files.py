import base64
import binascii
import io
import re
from uuid import UUID

from sqlalchemy.orm import Session
from uuid_utils.compat import uuid7

from core.exceptions import RefusedError
from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.file.models.file_models import File
from modules.file.types.file_types import FileBucket


DATA_URL_PATTERN = re.compile(r"^data:(?P<content_type>[\w/+.-]+);base64,(?P<data>.+)$", re.DOTALL)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}

MAX_SIZE_IN_BYTES = 10 * 1024 * 1024


def decode_data_url(data_url: str) -> tuple[str, bytes]:
    """
    Read the type and bytes of a file the front sent as a data URL.

    Args:
        data_url (str): `data:<type>;base64,<data>`.

    Returns:
        tuple[str, bytes]: Content type and bytes.

    Raises:
        RefusedError: document_invalid for anything but a base64 image or PDF under 10 MB.
    """
    match = DATA_URL_PATTERN.match(data_url)
    if match is None or match["content_type"] not in ALLOWED_CONTENT_TYPES:
        raise RefusedError("document_invalid", 422)
    try:
        content = base64.b64decode(match["data"], validate=True)
    except binascii.Error as error:
        raise RefusedError("document_invalid", 422) from error
    if len(content) > MAX_SIZE_IN_BYTES:
        raise RefusedError("document_invalid", 422)
    return match["content_type"], content


def store_private_file(db: Session, storage: RustFSClient, data_url: str, original_name: str, actor_id: UUID | None) -> File:
    """
    Put a document (Payment Proof, Expense Document) in the private bucket and record it as a File, in the caller's transaction; it is read back through signed URLs.

    Args:
        db (Session): Session of the record the document proves.
        storage (RustFSClient): RustFS client.
        data_url (str): The document as a data URL.
        original_name (str): Name it was picked with.
        actor_id (UUID | None): User adding it.

    Returns:
        File: The File, added but not committed.
    """
    content_type, content = decode_data_url(data_url)
    file_id = uuid7()
    storage_key = f"documents/{file_id}"
    storage.upload_object(storage_key, io.BytesIO(content), content_type, is_private=True)
    file = File(id=file_id, bucket=FileBucket.PRIVATE, storage_key=storage_key, original_name=original_name[:255] or "document", content_type=content_type, size_in_bytes=len(content), created_by_id=actor_id)
    db.add(file)
    return file
