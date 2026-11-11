import argparse
import sys

from core.app_init import init_models
from core.config import get_settings
from core.database import SessionLocal
from core.exceptions import SeedRefusedError
from seeds.services.demo_seed_services import DemoSeedService
from seeds.services.owner_seed_services import OwnerSeedService
from seeds.services.reference_seed_services import ReferenceSeedService
from seeds.types.seed_types import SeedPart


def parse_arguments() -> argparse.Namespace:
    """
    Read the seed part to run.

    Returns:
        argparse.Namespace: part (reference, demo or owner).
    """
    parser = argparse.ArgumentParser(prog="python -m seeds", description="Load Oleoziza reference data, demo data, or the first Owner.")
    parser.add_argument("part", choices=[part.value for part in SeedPart])
    return parser.parse_args()


def run_seed(part: SeedPart) -> int:
    """
    Run one seed part in its own session and print what it wrote.

    Args:
        part (SeedPart): reference, demo or owner.

    Returns:
        int: Process exit code, 0 on success and 1 when the seed refused to run.
    """
    init_models()
    settings = get_settings()
    with SessionLocal() as db:
        try:
            if part == SeedPart.REFERENCE:
                ReferenceSeedService(db).run()
                print("reference: provinces, cities and olive varieties loaded")
            elif part == SeedPart.DEMO:
                for label, count in DemoSeedService(db, settings).run().items():
                    print(f"demo: {label}: {count}")
            else:
                print("owner: created" if OwnerSeedService(db, settings).run() else "owner: already present, kept")
        except SeedRefusedError as error:
            db.rollback()
            print(f"{part.value}: refused ({error.code})", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(run_seed(SeedPart(parse_arguments().part)))
