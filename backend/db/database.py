import aiosqlite
import shutil
import time
from contextlib import asynccontextmanager
from pathlib import Path

from config import settings


@asynccontextmanager
async def get_db():
    db = await aiosqlite.connect(settings.db_path)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db():
    async with get_db() as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS assessment_cache (
                sha256_hash TEXT PRIMARY KEY,
                image_path TEXT NOT NULL,
                result_json TEXT NOT NULL,
                model TEXT NOT NULL,
                assessed_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS undo_operations (
                op_id TEXT PRIMARY KEY,
                original_paths_json TEXT NOT NULL,
                backup_dir TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await db.commit()


async def cleanup_old_backups():
    backup_root = Path(settings.backup_dir)
    if not backup_root.exists():
        return
    cutoff = time.time() - settings.backup_ttl_hours * 3600
    for backup_dir in backup_root.iterdir():
        if backup_dir.is_dir() and backup_dir.stat().st_mtime < cutoff:
            shutil.rmtree(backup_dir)
