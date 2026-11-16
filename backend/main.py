from fastapi import FastAPI

from core.app_init import init_models, init_routers, setup_cors, setup_exception_handlers
from core.http_cache import setup_http_caching


app = FastAPI(title="Oleoziza API")

init_models()
setup_http_caching(app)
setup_cors(app)
setup_exception_handlers(app)
init_routers(app)


@app.get("/")
async def get_root() -> dict[str, str]:
    """
    Tell a caller the API is up.

    Returns:
        dict[str, str]: Online status.
    """
    return {"status": "online"}
