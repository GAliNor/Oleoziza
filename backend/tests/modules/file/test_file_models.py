from core.app_init import init_models
from core.database import Base


def test_file_table_is_registered_with_a_unique_storage_key() -> None:
    """
    The File table registers, and two files can never share a RustFS key.
    """
    init_models()
    files = Base.metadata.tables["files"]

    assert files.c.storage_key.unique is True
    assert files.c.size_in_bytes.nullable is False
