from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.exceptions import SeedRefusedError
from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.site.business.season_art import store_illustration_image
from modules.site.models.site_models import SEASON_ILLUSTRATION_CODE_LENGTH, SeasonIllustration
from modules.site.types.site_types import SeasonArtVariant


SEASON_ILLUSTRATION_DIRECTORY = Path(__file__).resolve().parent.parent / "fixtures" / "seasons"

CONTENT_TYPE_BY_EXTENSION = {"webp": "image/webp", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}

DARK_SUFFIX = "-dark"


class IllustrationSeedService:
    def __init__(self, db: Session, storage: RustFSClient, directory: Path = SEASON_ILLUSTRATION_DIRECTORY) -> None:
        """
        Keep the session, the storage the pictures go to, and the folder holding the Season Illustration pairs.

        Args:
            db (Session): Seed database session.
            storage (RustFSClient): RustFS client.
            directory (Path): Folder of <code>.<ext> and <code>-dark.<ext> pairs.
        """
        self.db = db
        self.storage = storage
        self.directory = directory

    def run(self) -> list[str]:
        """
        Upload and register every pair in the folder whose code is not yet a Season Illustration; codes already registered are left as they are.

        Returns:
            list[str]: Codes of the Season Illustrations added.

        Raises:
            SeedRefusedError: illustration_pair_incomplete when a picture lacks its other version, illustration_code_too_long.
            StorageError: If RustFS refused or could not be reached.
        """
        pairs = read_illustration_pairs(self.directory)
        registered_codes = set(self.db.scalars(select(SeasonIllustration.code)))
        added_codes = []
        for code, (light_path, dark_path) in sorted(pairs.items()):
            if code in registered_codes:
                continue
            light_file = store_illustration_image(self.db, self.storage, code, SeasonArtVariant.LIGHT, light_path.read_bytes(), read_content_type(light_path), read_extension(light_path), light_path.name, None)
            dark_file = store_illustration_image(self.db, self.storage, code, SeasonArtVariant.DARK, dark_path.read_bytes(), read_content_type(dark_path), read_extension(dark_path), dark_path.name, None)
            self.db.add(SeasonIllustration(code=code, light_file_id=light_file.id, dark_file_id=dark_file.id))
            self.db.flush()
            added_codes.append(code)
        self.db.commit()
        return added_codes


def read_illustration_pairs(directory: Path) -> dict[str, tuple[Path, Path]]:
    """
    Pair each daylight picture of the folder with its dusk version.

    Args:
        directory (Path): Folder of <code>.<ext> and <code>-dark.<ext> images.

    Returns:
        dict[str, tuple[Path, Path]]: Daylight and dusk pictures by code.

    Raises:
        SeedRefusedError: illustration_pair_incomplete when a picture lacks its other version, illustration_code_too_long.
    """
    pictures = [path for path in directory.iterdir() if read_extension(path) in CONTENT_TYPE_BY_EXTENSION]
    light_by_code = {path.stem: path for path in pictures if not path.stem.endswith(DARK_SUFFIX)}
    dark_by_code = {path.stem.removesuffix(DARK_SUFFIX): path for path in pictures if path.stem.endswith(DARK_SUFFIX)}
    if set(light_by_code) != set(dark_by_code):
        raise SeedRefusedError("illustration_pair_incomplete")
    if any(len(code) > SEASON_ILLUSTRATION_CODE_LENGTH for code in light_by_code):
        raise SeedRefusedError("illustration_code_too_long")
    return {code: (light_by_code[code], dark_by_code[code]) for code in light_by_code}


def read_extension(path: Path) -> str:
    """
    Read a picture's extension, lowercased and without its dot.

    Args:
        path (Path): Picture file.

    Returns:
        str: Extension such as webp.
    """
    return path.suffix.lower().removeprefix(".")


def read_content_type(path: Path) -> str:
    """
    Give the MIME type a picture is served with.

    Args:
        path (Path): Picture file with a known extension.

    Returns:
        str: MIME type such as image/webp.
    """
    return CONTENT_TYPE_BY_EXTENSION[read_extension(path)]
