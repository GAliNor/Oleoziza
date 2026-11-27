from dataclasses import dataclass, field
from enum import StrEnum

from modules.site.types.site_types import CodeKind


class ResetModule(StrEnum):
    """
    What can be reset for a new round of tests.
    """

    CHARGES = "charges"
    LOTS = "lots"
    FINANCES = "finances"
    CLIENTS = "clients"
    CONFIGURATION = "configuration"
    SEASONS = "seasons"
    JOURNAL = "journal"
    ASSISTANT = "assistant"
    STAFF = "staff"


@dataclass(frozen=True)
class ResetScope:
    """
    What resetting one module empties, and the modules whose records would be left pointing at nothing.
    """

    label: str
    tables: tuple[str, ...]
    needs: tuple[ResetModule, ...] = ()
    code_kinds: tuple[CodeKind, ...] = ()


@dataclass
class ResetReport:
    """
    What a reset deletes, or deleted: rows per table, and the stored files to remove afterwards.
    """

    modules: list[ResetModule]
    added: list[ResetModule]
    rows_by_table: dict[str, int] = field(default_factory=dict)
    storage_keys: list[tuple[str, bool]] = field(default_factory=list)
