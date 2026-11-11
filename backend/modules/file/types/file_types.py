from enum import StrEnum


class FileBucket(StrEnum):
    """
    The RustFS bucket a file lives in: private files are served through signed URLs.
    """

    PRIVATE = "private"
    PUBLIC = "public"
