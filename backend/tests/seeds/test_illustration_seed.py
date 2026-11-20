from pathlib import Path
from typing import Any, cast

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.exceptions import SeedRefusedError
from core.integrations.rustfs.rustfs_client import RustFSClient
from modules.file.models.file_models import File
from modules.site.models.site_models import SeasonIllustration
from seeds.services.illustration_seed_services import IllustrationSeedService


class RecordingStorage:
    """
    Stands in for RustFS: remembers each uploaded key with its content type.
    """

    def __init__(self) -> None:
        """
        Start with nothing uploaded.
        """
        self.content_type_by_key: dict[str, str] = {}

    def upload_object(self, key: str, content: Any, content_type: str, is_private: bool) -> None:
        """
        Remember an upload to the public bucket.

        Args:
            key (str): Object key.
            content (Any): Picture bytes.
            content_type (str): MIME type.
            is_private (bool): Bucket visibility, always False for Season Illustrations.
        """
        assert is_private is False
        self.content_type_by_key[key] = content_type


def write_pictures(directory: Path, *names: str) -> Path:
    """
    Write small picture files into a fixture folder.

    Args:
        directory (Path): Folder to fill.
        names (str): File names to create.

    Returns:
        Path: The folder.
    """
    for name in names:
        (directory / name).write_bytes(b"picture")
    return directory


def build_seed(db: Session, storage: RecordingStorage, directory: Path) -> IllustrationSeedService:
    """
    Build the illustrations seed on a fixture folder and a recording storage.

    Args:
        db (Session): Test session.
        storage (RecordingStorage): Fake RustFS.
        directory (Path): Fixture folder.

    Returns:
        IllustrationSeedService: Seed ready to run.
    """
    return IllustrationSeedService(db, cast(RustFSClient, storage), directory)


def test_each_pair_becomes_one_season_illustration_once(db: Session, tmp_path: Path) -> None:
    """
    A daylight picture and its -dark version become one Season Illustration, and a second run adds nothing.
    """
    folder = write_pictures(tmp_path, "zz-grove.webp", "zz-grove-dark.webp", "zz-press.png", "zz-press-dark.png", "README.md")
    storage = RecordingStorage()

    first_run = build_seed(db, storage, folder).run()
    second_run = build_seed(db, storage, folder).run()

    grove = db.scalar(select(SeasonIllustration).where(SeasonIllustration.code == "zz-grove"))
    dark_key = db.scalar(select(File.storage_key).where(File.id == grove.dark_file_id))
    assert first_run == ["zz-grove", "zz-press"]
    assert second_run == []
    assert len(storage.content_type_by_key) == 4
    assert dark_key.startswith("seasons/zz-grove/dark-")
    assert sorted(set(storage.content_type_by_key.values())) == ["image/png", "image/webp"]


@pytest.mark.parametrize("names", [("zz-alone.webp",), ("zz-alone-dark.webp",)])
def test_a_picture_without_its_other_version_is_refused(db: Session, tmp_path: Path, names: tuple[str, ...]) -> None:
    """
    A pair missing its daylight or dusk picture stops the seed before anything is uploaded.
    """
    storage = RecordingStorage()

    with pytest.raises(SeedRefusedError) as error:
        build_seed(db, storage, write_pictures(tmp_path, *names)).run()

    assert error.value.code == "illustration_pair_incomplete"
    assert storage.content_type_by_key == {}
