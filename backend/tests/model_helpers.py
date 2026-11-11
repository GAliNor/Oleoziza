from sqlalchemy import CheckConstraint, Index, Table, UniqueConstraint

from core.app_init import init_models
from core.database import Base


def get_registered_table(table_name: str) -> Table:
    """
    Import every module's models and return one registered table.

    Args:
        table_name (str): Name of the table.

    Returns:
        Table: The table as registered on the app's metadata.
    """
    init_models()
    return Base.metadata.tables[table_name]


def get_registered_table_names() -> set[str]:
    """
    Import every module's models and list the registered table names.

    Returns:
        set[str]: Names of every table on the app's metadata.
    """
    init_models()
    return set(Base.metadata.tables)


def get_unique_column_sets(table_name: str) -> list[set[str]]:
    """
    List the column sets of a table's unique constraints.

    Args:
        table_name (str): Name of the registered table.

    Returns:
        list[set[str]]: One set of column names per unique constraint.
    """
    table = get_registered_table(table_name)
    return [{column.name for column in constraint.columns} for constraint in table.constraints if isinstance(constraint, UniqueConstraint)]


def get_check_names(table_name: str) -> set[str]:
    """
    List the names of a table's check constraints, as rendered by the naming convention.

    Args:
        table_name (str): Name of the registered table.

    Returns:
        set[str]: Check constraint names.
    """
    table = get_registered_table(table_name)
    return {str(constraint.name) for constraint in table.constraints if isinstance(constraint, CheckConstraint)}


def get_partial_unique_index_names(table_name: str) -> set[str]:
    """
    List the names of a table's unique indexes limited by a Postgres WHERE clause.

    Args:
        table_name (str): Name of the registered table.

    Returns:
        set[str]: Names of the partial unique indexes.
    """
    table = get_registered_table(table_name)
    return {str(index.name) for index in table.indexes if isinstance(index, Index) and index.unique and index.dialect_options["postgresql"]["where"] is not None}
