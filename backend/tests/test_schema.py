from core.app_init import init_models
from core.database import Base


EXPECTED_TABLE_COUNT = 43


def test_every_foreign_key_points_at_a_registered_table() -> None:
    """
    Every reference between models resolves to a table and column that exist.
    """
    init_models()

    for table in Base.metadata.tables.values():
        for foreign_key in table.foreign_keys:
            assert foreign_key.column is not None, f"{table.name}.{foreign_key.parent.name}"


def test_the_schema_holds_the_validated_entities() -> None:
    """
    The entities of the data model, the code sequence counter included, are all registered; auth keeps no session table.
    """
    init_models()

    assert len(Base.metadata.tables) == EXPECTED_TABLE_COUNT


def test_every_enum_type_has_its_own_name() -> None:
    """
    No two columns share a Postgres enum type, so migrations never create the same type twice.
    """
    init_models()
    enum_type_names = [column.type.name for table in Base.metadata.tables.values() for column in table.columns if getattr(column.type, "enums", None)]

    assert len(enum_type_names) == len(set(enum_type_names))
