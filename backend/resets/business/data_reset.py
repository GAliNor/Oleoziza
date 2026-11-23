from sqlalchemy import ColumnElement, ForeignKey, Select, Table, delete, or_, select, update
from sqlalchemy.orm import Session

from core.database import Base
from modules.file.models.file_models import File
from modules.file.types.file_types import FileBucket
from modules.site.models.site_models import CodeSequence
from modules.user.models.user_models import User
from modules.user.types.user_types import Role
from resets.business.reset_plan import expand_modules, list_tables
from resets.constants.reset_constants import SCOPES, USER_CHILD_TABLES
from resets.types.reset_types import ResetModule, ResetReport


def reset_modules(db: Session, chosen: list[ResetModule]) -> ResetReport:
    """
    Delete, uncommitted, every record of the modules chosen and of those pointing at them. Owners, Sites and reference data stay.

    Args:
        db (Session): Session of the reset.
        chosen (list[ResetModule]): Modules asked for.

    Returns:
        ResetReport: Rows deleted per table, and the stored files to remove once committed.
    """
    modules, added = expand_modules(chosen)
    report = ResetReport(modules=modules, added=added)
    tables = list_tables(modules)
    file_ids = list_file_ids(db, tables)
    if ResetModule.FINANCES in modules and ResetModule.LOTS not in modules:
        delete_oil_paid(db, report)
    users = build_users_to_delete(modules)
    if users is not None:
        forget_users(db, users, tables)
    for table in reversed(Base.metadata.sorted_tables):
        if table.name in tables:
            count_deleted(report, table.name, db.execute(delete(table)).rowcount)
        elif users is not None and table.name in USER_CHILD_TABLES:
            count_deleted(report, table.name, db.execute(delete(table).where(build_user_child_filter(table, users))).rowcount)
    if users is not None:
        count_deleted(report, "users", db.execute(delete(User).where(User.id.in_(users)).execution_options(synchronize_session=False)).rowcount)
    kinds = [kind for module in modules for kind in SCOPES[module].code_kinds]
    if kinds and "code_sequences" not in tables:
        count_deleted(report, "code_sequences", db.execute(delete(CodeSequence).where(CodeSequence.kind.in_(kinds))).rowcount)
    delete_files(db, file_ids, report)
    return report


def count_deleted(report: ResetReport, table: str, count: int) -> None:
    """
    Add rows to the report, leaving out tables that had none.

    Args:
        report (ResetReport): Report filled.
        table (str): Table name.
        count (int): Rows deleted.
    """
    if count:
        report.rows_by_table[table] = report.rows_by_table.get(table, 0) + count


def list_file_ids(db: Session, tables: set[str]) -> set:
    """
    Find the stored files the emptied tables point at.

    Args:
        db (Session): Session to read with.
        tables (set[str]): Tables to empty.

    Returns:
        set: File ids.
    """
    file_ids: set = set()
    for name in tables:
        for column in Base.metadata.tables[name].columns:
            if any(key.column.table.name == "files" for key in column.foreign_keys):
                file_ids |= set(db.scalars(select(column).where(column.is_not(None))))
    return file_ids


def delete_files(db: Session, file_ids: set, report: ResetReport) -> None:
    """
    Delete the rows of files nothing points at any more, remembering their keys for the storage.

    Args:
        db (Session): Session of the reset.
        file_ids (set): Files the emptied tables pointed at.
        report (ResetReport): Report filled.
    """
    if not file_ids:
        return
    files = list(db.scalars(select(File).where(File.id.in_(file_ids))))
    report.storage_keys = [(file.storage_key, file.bucket == FileBucket.PRIVATE) for file in files]
    count_deleted(report, "files", db.execute(delete(File).where(File.id.in_(file_ids)).execution_options(synchronize_session=False)).rowcount)


def delete_oil_paid(db: Session, report: ResetReport) -> None:
    """
    Delete the oil moved by Payments in oil when Payments go and Lots stay: the Client's oil comes back, the mill's goes.

    Args:
        db (Session): Session of the reset.
        report (ResetReport): Report filled.
    """
    draws, storages = Base.metadata.tables["storage_draws"], Base.metadata.tables["storages"]
    paid_storages = select(storages.c.id).where(storages.c.source_payment_id.is_not(None))
    count_deleted(report, "storage_draws", db.execute(delete(draws).where(or_(draws.c.payment_id.is_not(None), draws.c.storage_id.in_(paid_storages)))).rowcount)
    count_deleted(report, "storages", db.execute(delete(storages).where(storages.c.source_payment_id.is_not(None))).rowcount)


def build_users_to_delete(modules: list[ResetModule]) -> Select | None:
    """
    Choose the Users that go: staff but Owners with the staff module, Client Users with the clients module.

    Args:
        modules (list[ResetModule]): Modules to reset.

    Returns:
        Select | None: Query of their ids, None when none goes.
    """
    filters: list[ColumnElement[bool]] = []
    if ResetModule.STAFF in modules:
        filters.append((User.role != Role.CLIENT) & User.is_owner.is_(False))
    if ResetModule.CLIENTS in modules:
        filters.append(User.role == Role.CLIENT)
    return select(User.id).where(or_(*filters)) if filters else None


def forget_users(db: Session, users: Select, tables: set[str]) -> None:
    """
    Empty « created by », « decided by »… wherever a kept record names a User who goes.

    Args:
        db (Session): Session of the reset.
        users (Select): Ids of the Users who go.
        tables (set[str]): Tables emptied anyway.
    """
    for table in Base.metadata.sorted_tables:
        if table.name in tables or table.name in USER_CHILD_TABLES:
            continue
        for key in list_user_keys(table):
            if key.parent.nullable:
                db.execute(update(table).where(key.parent.in_(users)).values({key.parent.name: None}))


def list_user_keys(table: Table) -> list[ForeignKey]:
    """
    List a table's foreign keys to users.

    Args:
        table (Table): Table.

    Returns:
        list[ForeignKey]: Its keys to users.
    """
    return [key for key in table.foreign_keys if key.column.table.name == "users"]


def build_user_child_filter(table: Table, users: Select) -> ColumnElement[bool]:
    """
    Choose the rows that belong to the Users who go: through user_id, or through their Site Assignments.

    Args:
        table (Table): A table owned by Users.
        users (Select): Ids of the Users who go.

    Returns:
        ColumnElement[bool]: The filter.
    """
    if "user_id" in table.c:
        return table.c.user_id.in_(users)
    assignments = Base.metadata.tables["site_assignments"]
    return table.c.site_assignment_id.in_(select(assignments.c.id).where(assignments.c.user_id.in_(users)))


