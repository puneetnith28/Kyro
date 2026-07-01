from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sentry_sdk
from contextlib import asynccontextmanager

from app.api.endpoints import router as api_router
from app.services.memory_service import setup_cognee
from app.services.cache_service import cache
from app.core.database import init_db, close_db
from app.utils.logger import get_logger
from app.core.config import settings

logger = get_logger(__name__)

# Initialize Sentry for production monitoring
if settings.DEBUG_MODE is False and settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Kyro Backend and Cognee Memory System...")
    await setup_cognee()
    await cache.connect()
    await init_db()
    logger.info("Kyro Backend Started successfully.")
    yield
    await cache.disconnect()
    await close_db()
    logger.info("Kyro Backend Shutdown.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend for Kyro: Your AI That Never Forgets",
    version="1.0.0",
    lifespan=lifespan,
    debug=settings.DEBUG_MODE,
)

# Allow connections from Browser Extension and Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to extension ID and frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "kyro-backend"}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    formatted_errors = []
    for error in errors:
        formatted_errors.append({
            "loc": " -> ".join([str(loc) for loc in error.get("loc", [])]),
            "msg": error.get("msg"),
            "type": error.get("type")
        })
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation Error", "errors": formatted_errors}
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
