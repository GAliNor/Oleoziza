from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.http_cache import setup_http_caching


def build_app() -> FastAPI:
    """
    Build a small app with the caching middlewares and two routes: a read and a write.

    Returns:
        FastAPI: The test app.
    """
    app = FastAPI()
    setup_http_caching(app)

    @app.get("/api/things")
    def list_things() -> list[str]:
        return ["olive"] * 400

    @app.post("/api/things")
    def create_thing() -> dict[str, str]:
        return {"status": "created"}

    return app


def test_a_read_carries_an_etag_and_revalidates_by_default() -> None:
    """
    A GET answer gets an ETag and « private, no-cache », so the browser asks again but cheaply.
    """
    response = TestClient(build_app()).get("/api/things")

    assert response.headers["etag"].startswith('W/"')
    assert response.headers["cache-control"] == "private, no-cache"


def test_the_same_body_is_answered_304_without_it() -> None:
    """
    A browser sending back the ETag of the body it holds gets an empty 304.
    """
    client = TestClient(build_app())
    etag = client.get("/api/things").headers["etag"]

    response = client.get("/api/things", headers={"If-None-Match": etag})

    assert response.status_code == 304
    assert response.content == b""


def test_large_answers_are_compressed() -> None:
    """
    An answer above 1,000 bytes is gzipped for a browser that accepts it.
    """
    response = TestClient(build_app()).get("/api/things", headers={"Accept-Encoding": "gzip"})

    assert response.headers["content-encoding"] == "gzip"


def test_writes_carry_no_etag() -> None:
    """
    Only reads are fingerprinted.
    """
    response = TestClient(build_app()).post("/api/things")

    assert "etag" not in response.headers
