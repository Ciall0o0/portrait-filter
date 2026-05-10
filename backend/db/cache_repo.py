import json
from datetime import datetime

from db.database import get_db


async def get_cached_result(sha256_hash: str, model: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT result_json FROM assessment_cache WHERE sha256_hash = ? AND model = ?",
            (sha256_hash, model),
        )
        row = await cursor.fetchone()
        if row:
            return json.loads(row[0])
        return None


async def put_cached_result(sha256_hash: str, image_path: str, model: str, result: dict):
    async with get_db() as db:
        await db.execute(
            """INSERT OR REPLACE INTO assessment_cache
               (sha256_hash, image_path, result_json, model, assessed_at)
               VALUES (?, ?, ?, ?, ?)""",
            (sha256_hash, image_path, json.dumps(result), model, datetime.now().isoformat()),
        )
        await db.commit()


async def save_undo_operation(op_id: str, original_paths: list[str], backup_dir: str):
    async with get_db() as db:
        await db.execute(
            "INSERT INTO undo_operations (op_id, original_paths_json, backup_dir, created_at) VALUES (?, ?, ?, ?)",
            (op_id, json.dumps(original_paths), backup_dir, datetime.now().isoformat()),
        )
        await db.commit()


async def get_undo_operation(op_id: str) -> dict | None:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM undo_operations WHERE op_id = ?", (op_id,)
        )
        row = await cursor.fetchone()
        if row:
            return {
                "op_id": row[0],
                "original_paths": json.loads(row[1]),
                "backup_dir": row[2],
                "created_at": row[3],
            }
        return None


async def delete_undo_operation(op_id: str):
    async with get_db() as db:
        await db.execute("DELETE FROM undo_operations WHERE op_id = ?", (op_id,))
        await db.commit()


async def get_all_cached_for_folder(folder: str) -> list[dict]:
    """Get all cached assessment results whose paths start with folder."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT result_json FROM assessment_cache WHERE image_path LIKE ?",
            (f"{folder}%",),
        )
        rows = await cursor.fetchall()
        return [json.loads(row[0]) for row in rows]
