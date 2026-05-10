from fastapi import APIRouter, HTTPException, Query

from models.image import DeleteRequest, DeleteResponse, UndoResponse
from services.delete_service import safe_delete_images, undo_delete_images

router = APIRouter()


@router.post("/delete", response_model=DeleteResponse)
async def delete_images(req: DeleteRequest):
    if not req.confirmed:
        raise HTTPException(status_code=400, detail="Confirmation required")
    if not req.image_ids:
        raise HTTPException(status_code=400, detail="No image paths provided")

    # The frontend sends actual file paths in image_ids field
    result = await safe_delete_images(req.image_ids)
    return result


@router.post("/undo", response_model=UndoResponse)
async def undo_delete(op_id: str = Query(...)):
    result = await undo_delete_images(op_id)
    if result["restored_count"] == 0:
        raise HTTPException(status_code=404, detail="Undo operation not found or expired")
    return result
