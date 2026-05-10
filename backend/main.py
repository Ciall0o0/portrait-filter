import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db.database import init_db, cleanup_old_backups
from routes import folders, images, assessment, actions, export, config


def _get_frontend_dist():
    """Resolve frontend dist dir. Returns None when bundled with PyInstaller."""
    if getattr(sys, "frozen", False):
        return None  # Electron serves the frontend via loadFile
    dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
    return dist if dist.exists() else None


FRONTEND_DIST = _get_frontend_dist()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.gather(init_db(), cleanup_old_backups())
    yield


app = FastAPI(title="Portrait Filter", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
routers = [
    (folders.router, "/api/folders", "folders"),
    (images.router, "/api/images", "images"),
    (assessment.router, "/api/assess", "assessment"),
    (actions.router, "/api/images", "actions"),
    (export.router, "/api/export", "export"),
    (config.router, "/api/config", "config"),
]

for router, prefix, tag in routers:
    app.include_router(router, prefix=prefix, tags=[tag])

# Serve frontend static files in development / non-Electron mode
if FRONTEND_DIST:
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
