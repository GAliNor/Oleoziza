from collections.abc import Callable, Generator, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from core.database import get_db
from main import app


UNREACHABLE_DATABASE_URL = "postgresql+psycopg2://test:test@127.0.0.1:1/oleoziza-test?connect_timeout=1"


def build_get_db(database_url: str) -> Callable[[], Generator[Session, None, None]]:
    """
    Build a get_db replacement opening sessions on the given database.

    Args:
        database_url (str): SQLAlchemy URL of the database to probe.

    Returns:
        Callable[[], Generator[Session, None, None]]: Dependency yielding a session on that database.
    """
    session_factory = sessionmaker(bind=create_engine(database_url))

    def get_test_db() -> Generator[Session, None, None]:
        """
        Open a session on the test database and close it afterwards.

        Returns:
            Generator[Session, None, None]: The request-scoped session.
        """
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    return get_test_db


@pytest.fixture
def build_client() -> Iterator[Callable[[str], TestClient]]:
    """
    Provide a factory of API clients whose database is the given URL.

    Returns:
        Iterator[Callable[[str], TestClient]]: Factory taking a database URL.
    """

    def build(database_url: str) -> TestClient:
        """
        Point get_db at the database and return a client on the app.

        Args:
            database_url (str): SQLAlchemy URL of the database.

        Returns:
            TestClient: Client calling the app.
        """
        app.dependency_overrides[get_db] = build_get_db(database_url)
        return TestClient(app)

    yield build
    app.dependency_overrides.clear()


def test_health_is_ok_when_the_database_answers(build_client: Callable[[str], TestClient]) -> None:
    """
    A reachable database gives status ok.

    Args:
        build_client (Callable[[str], TestClient]): Client factory.
    """
    response = build_client("sqlite://").get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "is_database_reachable": True}


def test_health_is_degraded_when_the_database_is_unreachable(build_client: Callable[[str], TestClient]) -> None:
    """
    An unreachable database gives status degraded, still with a 200.

    Args:
        build_client (Callable[[str], TestClient]): Client factory.
    """
    response = build_client(UNREACHABLE_DATABASE_URL).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "degraded", "is_database_reachable": False}
