import logging
import os
from contextlib import asynccontextmanager

from app.routes import all_routers
from app.services.flam import load_model, unload_model
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Lifespan: Model Loading at Startup
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load FLAM model at startup, cleanup on shutdown."""
    load_model()
    yield
    unload_model()


# =============================================================================
# App Creation & Middleware
# =============================================================================

app = FastAPI(title="FLAM Backend", version="0.2.0", lifespan=lifespan)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all route routers
for router in all_routers:
    app.include_router(router)


# =============================================================================
# Static File Serving (for Railway deployment)
# =============================================================================

static_dir = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_react_app():
        """Serve the React app's index.html."""
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend not found")

    @app.get("/{path:path}")
    async def serve_react_routes(path: str):
        """
        Serve static files or fall back to index.html for client-side routing.
        This must be defined after all API routes.
        """
        if (
            path.startswith("api/")
            or path
            in [
                "health",
                "model-status",
                "prompts",
                "system-info",
                "recommend-buffer",
                "classify",
                "classify-local",
                "analyze-youtube",
                "analyze-url",
                "prepare-youtube-video",
                "prepare-video",
                "cleanup-video",
            ]
            or path.startswith("stream-video/")
            or path.startswith("stream-audio/")
            or path.startswith("cleanup-video/")
        ):
            raise HTTPException(status_code=404, detail="Not found")

        file_path = os.path.join(static_dir, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

        raise HTTPException(status_code=404, detail="Not found")
