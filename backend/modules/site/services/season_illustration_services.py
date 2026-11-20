from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.integrations.rustfs.rustfs_client import RustFSClient, get_rustfs_client
from core.security import get_current_user
from core.types import CurrentUser
from modules.site.business.season_art import read_season_illustrations
from modules.site.types.site_types import SeasonIllustrationOut


class SeasonIllustrationService:
    def __init__(self, db: Session, storage: RustFSClient) -> None:
        """
        Keep the session and the storage the Season Illustrations' pictures are served from.

        Args:
            db (Session): Request-scoped database session.
            storage (RustFSClient): RustFS client, which builds the public URLs.
        """
        self.db = db
        self.storage = storage

    def list_illustrations(self) -> list[SeasonIllustrationOut]:
        """
        List every available Season Illustration, newest code first.

        Returns:
            list[SeasonIllustrationOut]: The Season Illustrations with their two pictures' URLs.
        """
        return list(read_season_illustrations(self.db, self.storage).values())


def get_season_illustration_service(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    storage: RustFSClient = Depends(get_rustfs_client),
) -> SeasonIllustrationService:
    """
    Build the Season Illustration service for one signed-in request.

    Args:
        db (Session): Request-scoped database session.
        current_user (CurrentUser): User from the access token; any signed-in User may read the list.
        storage (RustFSClient): Shared RustFS client.

    Returns:
        SeasonIllustrationService: Service bound to the session and storage.
    """
    return SeasonIllustrationService(db, storage)
