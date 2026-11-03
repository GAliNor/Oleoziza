from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from core.database import get_db
from modules.health.types.health_types import HealthOut


class HealthService:
    def __init__(self, db: Session) -> None:
        """
        Keep the session used to probe the database.

        Args:
            db (Session): Request-scoped database session.
        """
        self.db = db

    def get_health(self) -> HealthOut:
        """
        Report whether the API can reach its database.

        Returns:
            HealthOut: Overall status and database reachability.
        """
        is_database_reachable = self._is_database_reachable()
        return HealthOut(
            status="ok" if is_database_reachable else "degraded",
            is_database_reachable=is_database_reachable,
        )

    def _is_database_reachable(self) -> bool:
        """
        Run a trivial query against the database.

        Returns:
            bool: True when the query succeeds.
        """
        try:
            self.db.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError:
            return False


def get_health_service(db: Session = Depends(get_db)) -> HealthService:
    """
    Build the health service for one request.

    Args:
        db (Session): Request-scoped database session.

    Returns:
        HealthService: Service bound to the session.
    """
    return HealthService(db)
