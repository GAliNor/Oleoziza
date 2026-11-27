import argparse
import sys

from core.app_init import init_models
from core.config import get_settings
from core.database import SessionLocal
from core.exceptions import SeedRefusedError
from core.integrations.rustfs.rustfs_client import get_rustfs_client
from seeds.services.audit_seed_services import AuditSeedService
from seeds.services.demo_seed_services import DemoSeedService
from seeds.services.illustration_seed_services import IllustrationSeedService
from seeds.services.owner_seed_services import OwnerSeedService
from seeds.services.reference_seed_services import ReferenceSeedService
from seeds.services.site_seed_services import SiteSeedService
from seeds.types.seed_types import SeedPart


def parse_arguments() -> argparse.Namespace:
    """
    Read the seed part to run.

    Returns:
        argparse.Namespace: part (reference, illustrations, site, demo, owner or audit).
    """
    parser = argparse.ArgumentParser(prog="python -m seeds", description="Load Oleoziza reference data, the Season Illustrations, the first Site, demo data, the first Owner, or the local audit fixtures.")
    parser.add_argument("part", choices=[part.value for part in SeedPart])
    return parser.parse_args()


def run_seed(part: SeedPart) -> int:
    """
    Run one seed part in its own session and print what it wrote.

    Args:
        part (SeedPart): reference, illustrations, site, demo, owner or audit.

    Returns:
        int: Process exit code, 0 on success and 1 when the seed refused to run.
    """
    init_models()
    settings = get_settings()
    with SessionLocal() as db:
        try:
            if part == SeedPart.REFERENCE:
                ReferenceSeedService(db).run()
                print("reference: provinces, cities, olive varieties, expense categories and AI models loaded")
            elif part == SeedPart.ILLUSTRATIONS:
                added_codes = IllustrationSeedService(db, get_rustfs_client()).run()
                print(f"illustrations: {', '.join(added_codes) if added_codes else 'none new'} added")
            elif part == SeedPart.SITE:
                print("site: Oujda created" if SiteSeedService(db).run() else "site: a Site already exists, kept")
            elif part == SeedPart.DEMO:
                for label, count in DemoSeedService(db, settings, get_rustfs_client()).run().items():
                    print(f"demo: {label}: {count}")
            elif part == SeedPart.AUDIT:
                for label, count in AuditSeedService(db, settings, get_rustfs_client()).run().items():
                    print(f"audit: {label}: {count}")
            else:
                print("owner: created" if OwnerSeedService(db, settings).run() else "owner: already present, kept")
        except SeedRefusedError as error:
            db.rollback()
            print(f"{part.value}: refused ({error.code})", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(run_seed(SeedPart(parse_arguments().part)))
