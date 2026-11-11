from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base
from core.model_mixins import AuditMixin, IdMixin, build_enum_type
from modules.file.types.file_types import FileBucket


STORAGE_KEY_LENGTH = 512

ORIGINAL_NAME_LENGTH = 255

CONTENT_TYPE_LENGTH = 100


class File(IdMixin, AuditMixin, Base):
    """
    One uploaded image or PDF (a Lot photo, a Payment Proof), stored in RustFS.
    """

    __tablename__ = "files"

    bucket: Mapped[FileBucket] = mapped_column(build_enum_type(FileBucket, "file_bucket"))
    storage_key: Mapped[str] = mapped_column(String(STORAGE_KEY_LENGTH), unique=True)
    original_name: Mapped[str] = mapped_column(String(ORIGINAL_NAME_LENGTH))
    content_type: Mapped[str] = mapped_column(String(CONTENT_TYPE_LENGTH))
    size_in_bytes: Mapped[int] = mapped_column(BigInteger)
