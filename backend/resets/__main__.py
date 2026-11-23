import argparse
import sys

from core.app_init import init_models
from core.database import SessionLocal
from core.exceptions import StorageError
from core.integrations.rustfs.rustfs_client import get_rustfs_client
from resets.business.data_reset import reset_modules
from resets.constants.reset_constants import SCOPES
from resets.types.reset_types import ResetModule, ResetReport


def parse_arguments() -> argparse.Namespace:
    """
    Read the command: list the modules, plan a reset (nothing is written), or apply it.

    Returns:
        argparse.Namespace: command and modules.
    """
    parser = argparse.ArgumentParser(prog="python -m resets", description="Delete the records of chosen business modules, to test again. Run through scripts/reset-data.sh, which dumps the database first.")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("list")
    for name in ("plan", "apply"):
        command = commands.add_parser(name)
        command.add_argument("modules", nargs="+", choices=[module.value for module in ResetModule])
    return parser.parse_args()


def print_modules() -> None:
    """
    Print every module with what it holds.
    """
    for module in ResetModule:
        print(f"{module.value}\t{SCOPES[module].label}")


def print_report(report: ResetReport) -> None:
    """
    Print what a reset deletes, or deleted.

    Args:
        report (ResetReport): The report.
    """
    print("Modules: " + ", ".join(module.value for module in report.modules))
    if report.added:
        print("Added because their records point at the ones chosen: " + ", ".join(module.value for module in report.added))
    for table, count in sorted(report.rows_by_table.items()):
        print(f"  {table}: {count}")
    print(f"  stored files: {len(report.storage_keys)}")


def run_reset(modules: list[ResetModule], is_applied: bool) -> None:
    """
    Reset in one transaction: rolled back for a plan, committed otherwise, the stored files removed only once committed.

    Args:
        modules (list[ResetModule]): Modules chosen.
        is_applied (bool): Whether the reset is kept.
    """
    init_models()
    with SessionLocal() as db:
        report = reset_modules(db, modules)
        if not is_applied:
            db.rollback()
            print_report(report)
            return
        db.commit()
    print_report(report)
    remove_stored_files(report)


def remove_stored_files(report: ResetReport) -> None:
    """
    Remove from RustFS the files whose records went; one that can't be removed is told, the records are gone either way.

    Args:
        report (ResetReport): The report.
    """
    storage = get_rustfs_client()
    failed_count = 0
    for key, is_private in report.storage_keys:
        try:
            storage.delete_object(key, is_private)
        except StorageError:
            failed_count += 1
    if failed_count:
        print(f"{failed_count} stored files could not be removed from RustFS.", file=sys.stderr)


def main() -> None:
    """
    Run the command asked for.
    """
    arguments = parse_arguments()
    if arguments.command == "list":
        print_modules()
        return
    run_reset([ResetModule(module) for module in arguments.modules], is_applied=arguments.command == "apply")


if __name__ == "__main__":
    main()
