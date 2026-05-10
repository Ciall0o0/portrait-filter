from fastapi import APIRouter, HTTPException

from models.image import FolderBrowseRequest
from services.file_service import browse_parent_folder

router = APIRouter()


def _require_folder(path: str) -> dict:
    result = browse_parent_folder(path)
    if not result["exists"]:
        raise HTTPException(status_code=400, detail=f"Path does not exist: {path}")
    return result


@router.post("/open")
async def open_folder(req: FolderBrowseRequest):
    return _require_folder(req.path)


@router.get("/browse")
async def browse_folder(path: str):
    return _require_folder(path)
