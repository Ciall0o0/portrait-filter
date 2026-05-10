import shutil
import uuid
from pathlib import Path

from send2trash import send2trash

from config import settings
from db.cache_repo import (
    save_undo_operation,
    get_undo_operation,
    delete_undo_operation,
)


async def safe_delete_images(image_paths: list[str]) -> dict:
    op_id = str(uuid.uuid4())
    backup_dir = Path(settings.backup_dir) / op_id
    backup_dir.mkdir(parents=True, exist_ok=True)

    deleted_paths = []
    for path_str in image_paths:
        src = Path(path_str)
        backup_path = backup_dir / src.name
        try:
            shutil.copy2(src, backup_path)
        except FileNotFoundError:
            continue

        try:
            send2trash(str(src))
            deleted_paths.append(path_str)
        except Exception:
            shutil.copy2(backup_path, src)  # restore backup on failure

    if deleted_paths:
        await save_undo_operation(op_id, deleted_paths, str(backup_dir))

    return {
        "op_id": op_id,
        "deleted_count": len(deleted_paths),
        "deleted_paths": deleted_paths,
    }


async def undo_delete_images(op_id: str) -> dict:
    op = await get_undo_operation(op_id)
    if not op:
        return {"op_id": op_id, "restored_count": 0, "restored_paths": []}

    backup_dir = Path(op["backup_dir"])
    restored_paths = []

    for original_path in op["original_paths"]:
        backup_path = backup_dir / Path(original_path).name
        try:
            shutil.copy2(backup_path, original_path)
            restored_paths.append(original_path)
        except FileNotFoundError:
            continue

    if backup_dir.is_dir():
        shutil.rmtree(backup_dir)

    await delete_undo_operation(op_id)

    return {
        "op_id": op_id,
        "restored_count": len(restored_paths),
        "restored_paths": restored_paths,
    }
