import importlib
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings


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
    Allow the origins listed in CORS_ALLOWED_ORIGINS (comma-separated, or *).

    Args:
        app (FastAPI): Application receiving the middleware.
    """
    settings = get_settings()
    allowed_origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
