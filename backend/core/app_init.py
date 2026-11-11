import importlib
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import get_settings
from core.exceptions import AuthError, RefusedError, StorageError


MODULES_DIRECTORY = Path(__file__).resolve().parent.parent / "modules"


def init_models() -> None:
    """
    Import every modules/<module>/models/*_models.py so all tables register on Base.metadata.
    """
    for models_file in sorted(MODULES_DIRECTORY.glob("*/models/*_models.py")):
        module_name = models_file.parent.parent.name
        importlib.import_module(f"modules.{module_name}.models.{models_file.stem}")


def init_routers(app: FastAPI) -> None:
    """
    Discover every modules/<module>/routes/*_routes.py and mount its router under /api/<module-name>.

    Args:
        app (FastAPI): Application receiving the routers.

    Raises:
        AttributeError: If a routes file does not expose a `router`.
    """
    for routes_file in sorted(MODULES_DIRECTORY.glob("*/routes/*_routes.py")):
        module_name = routes_file.parent.parent.name
        import_path = f"modules.{module_name}.routes.{routes_file.stem}"
        routes_module = importlib.import_module(import_path)
        if not hasattr(routes_module, "router"):
            raise AttributeError(f"'router' not found in {import_path}")
        app.include_router(routes_module.router, prefix=f"/api/{module_name.replace('_', '-')}")


def setup_cors(app: FastAPI) -> None:
    """
    Allow the origins listed in CORS_ALLOWED_ORIGINS (comma-separated); credentials such as the refresh cookie only for explicit origins, never with *.

    Args:
        app (FastAPI): Application receiving the middleware.
    """
    settings = get_settings()
    allowed_origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials="*" not in allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Answer every refused authentication or business rule with its status and a {"code": ...} body the front reads.

    Args:
        app (FastAPI): Application receiving the handlers.
    """
    app.add_exception_handler(AuthError, build_auth_error_response)
    app.add_exception_handler(RefusedError, build_refused_error_response)
    app.add_exception_handler(StorageError, build_storage_error_response)


def build_auth_error_response(request: Request, error: AuthError) -> JSONResponse:
    """
    Turn an auth refusal into its JSON answer, with the end of the lock for a locked account.

    Args:
        request (Request): Request that failed.
        error (AuthError): Refusal raised by auth code.

    Returns:
        JSONResponse: The error status with {"code": ..., "lockedUntil": ...}.
    """
    content: dict[str, str] = {"code": error.code}
    if error.locked_until is not None:
        content["lockedUntil"] = error.locked_until.isoformat()
    headers = {"WWW-Authenticate": "Bearer"} if error.status_code == 401 else None
    return JSONResponse(status_code=error.status_code, content=content, headers=headers)


def build_refused_error_response(request: Request, error: RefusedError) -> JSONResponse:
    """
    Turn a broken business rule into its JSON answer.

    Args:
        request (Request): Request that failed.
        error (RefusedError): Refusal raised by a service.

    Returns:
        JSONResponse: The error status with {"code": ...}.
    """
    return JSONResponse(status_code=error.status_code, content={"code": error.code})


def build_storage_error_response(request: Request, error: StorageError) -> JSONResponse:
    """
    Answer a failed file storage call with 503, so the front can say to try again.

    Args:
        request (Request): Request that failed.
        error (StorageError): Storage failure.

    Returns:
        JSONResponse: 503 with {"code": "storage_unavailable"}.
    """
    return JSONResponse(status_code=503, content={"code": "storage_unavailable"})
