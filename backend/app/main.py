import logging
import os
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core import db
from .core.auth import get_current_user, init_firebase
from .core.cache import cache
from .core.config import get_settings
from .core.logging import configure_logging
from .models.job import JobStatus
from .prompts.prompt_registry import build_default_registry
from .routes import health, jobs, integrations, ws, mcp, providers
from .services.pipeline import PipelineService
from .utils.errors import ServiceError
from .utils.events import JobEventManager


settings = get_settings()
configure_logging(settings.log_level)
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(jobs.router, prefix=settings.api_prefix, dependencies=[Depends(get_current_user)])
app.include_router(integrations.router, prefix=settings.api_prefix, dependencies=[Depends(get_current_user)])
app.include_router(providers.router, prefix=settings.api_prefix, dependencies=[Depends(get_current_user)])
app.include_router(ws.router)
app.include_router(mcp.router, prefix=settings.api_prefix, dependencies=[Depends(get_current_user)])

events_manager = JobEventManager()
prompt_registry = build_default_registry(os.path.join(os.path.dirname(__file__), "prompts"))
pipeline_service = PipelineService(prompt_registry, events_manager)

app.state.events = events_manager
app.state.pipeline = pipeline_service


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError):
    return JSONResponse(
        status_code=502,
        content={"stage": exc.stage, "error_code": exc.code, "message": exc.message, "provider_response": exc.provider_response},
    )


@app.on_event("startup")
async def on_startup() -> None:
    await db.connect_to_mongo()
    await db.ensure_indexes()
    await cache.init()
    init_firebase()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await db.close_mongo_connection()
