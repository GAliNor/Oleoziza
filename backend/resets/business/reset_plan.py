from resets.constants.reset_constants import SCOPES
from resets.types.reset_types import ResetModule


def expand_modules(chosen: list[ResetModule]) -> tuple[list[ResetModule], list[ResetModule]]:
    """
    Add to the modules chosen every module whose records point at them, so nothing is left pointing at nothing.

    Args:
        chosen (list[ResetModule]): Modules asked for.

    Returns:
        tuple[list[ResetModule], list[ResetModule]]: Every module to reset, and those added.
    """
    expanded = list(dict.fromkeys(chosen))
    for module in expanded:
        expanded.extend(needed for needed in SCOPES[module].needs if needed not in expanded)
    ordered = [module for module in ResetModule if module in expanded]
    return ordered, [module for module in ordered if module not in chosen]


def list_tables(modules: list[ResetModule]) -> set[str]:
    """
    Gather the tables the modules empty.

    Args:
        modules (list[ResetModule]): Modules to reset.

    Returns:
        set[str]: Table names.
    """
    return {table for module in modules for table in SCOPES[module].tables}
