import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session


os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "127.0.0.1")
os.environ.setdefault("DB_NAME", "oleoziza-test")
os.environ.setdefault("RUSTFS_ACCESS_KEY", "test-access-key")
os.environ.setdefault("RUSTFS_SECRET_KEY", "test-secret-key")
os.environ.setdefault("AUTH_PRIVATE_JWK", '{"kty":"EC","crv":"P-256","x":"2ZyoYGkBS_kqBwM6bzvl6GCRD5c1UrjzQDJrGB2eC9I","y":"iaM0Ahx6v7YNSrj2--BhPRiLkT8VGW3-zG1aiEpvo9w","d":"oeEDe0ZaMDtygWsc67_mhT9MjBaLBL6Q-_ZFncxnm5o"}')

@pytest.fixture
def db() -> Iterator[Session]:
    """
    Open a session on the dev database inside a transaction that is rolled back afterwards, so commits leave nothing behind; skip when the database is unreachable.

    Returns:
        Iterator[Session]: Session whose commits become savepoints.
    """
    from core.database import engine

    try:
        connection = engine.connect()
        connection.execute(text("SELECT 1 FROM users LIMIT 1"))
        connection.rollback()
    except OperationalError:
        pytest.skip("database unreachable")
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    """
    Serve the app with its database dependency bound to the rolled-back session.

    Args:
        db (Session): Test session.

    Returns:
        Iterator[TestClient]: Client keeping cookies between calls.
    """
    from core.database import get_db
    from main import app

    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
