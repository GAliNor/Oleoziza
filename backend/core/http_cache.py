import hashlib

from fastapi import FastAPI, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


DEFAULT_CACHE_CONTROL = "private, no-cache"

REFERENCE_CACHE_CONTROL = "private, max-age=86400"

GZIP_MINIMUM_SIZE_IN_BYTES = 1000

GZIP_COMPRESS_LEVEL = 5


def build_etag(body: bytes) -> str:
    """
    Fingerprint a response body, so a browser holding the same body is answered 304 without it.

    Args:
        body (bytes): Response body.

    Returns:
        str: Weak ETag built from the body's hash.
    """
    return f'W/"{hashlib.sha1(body, usedforsecurity=False).hexdigest()}"'


def is_cacheable(request: Request, response: Response) -> bool:
    """
    Tell whether a response can carry an ETag: a successful API GET that is not an event stream, which must flow as it is written.

    Args:
        request (Request): Incoming request.
        response (Response): Answer about to leave.

    Returns:
        bool: True for a 200 answer to a GET under /api, other than text/event-stream.
    """
    is_event_stream = response.headers.get("content-type", "").startswith("text/event-stream")
    return request.method == "GET" and response.status_code == 200 and request.url.path.startswith("/api/") and not is_event_stream


class EtagMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """
        Add an ETag and a Cache-Control (revalidate by default) to API GET answers, and answer 304 when the browser already holds that body.

        Args:
            request (Request): Incoming request.
            call_next (RequestResponseEndpoint): The rest of the app.

        Returns:
            Response: The answer, or an empty 304.
        """
        response = await call_next(request)
        if not is_cacheable(request, response):
            return response
        body = b"".join([chunk async for chunk in response.body_iterator])
        etag = build_etag(body)
        headers = {key: value for key, value in response.headers.items() if key.lower() != "content-length"}
        headers["ETag"] = etag
        headers.setdefault("cache-control", DEFAULT_CACHE_CONTROL)
        if request.headers.get("if-none-match") == etag:
            return Response(status_code=304, headers={"ETag": etag, "Cache-Control": headers["cache-control"]})
        return Response(content=body, status_code=response.status_code, headers=headers, media_type=response.media_type)


def setup_http_caching(app: FastAPI) -> None:
    """
    Fingerprint API GET answers with ETags and compress large answers, so reloads and slow networks cost less.

    Args:
        app (FastAPI): Application receiving the middlewares.
    """
    app.add_middleware(EtagMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=GZIP_MINIMUM_SIZE_IN_BYTES, compresslevel=GZIP_COMPRESS_LEVEL)
