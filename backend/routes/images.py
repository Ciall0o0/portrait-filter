import asyncio

from fastapi import APIRouter, HTTPException

from services.file_service import scan_folder, generate_thumbnail_base64

router = APIRouter()


@router.get("")
async def list_images(folder: str = "", page: int = 1, per_page: int = 100):
    images = await asyncio.to_thread(scan_folder, folder)
    images.sort(key=lambda x: x["filename"].lower())

    total = len(images)
    start = (page - 1) * per_page
    end = start + per_page
    page_images = images[start:end]

    return {
        "images": page_images,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/{image_id}/thumbnail")
async def get_thumbnail(image_id: str, path: str = ""):
    if not path:
        raise HTTPException(status_code=400, detail="Path parameter is required")

    data_uri = await asyncio.to_thread(generate_thumbnail_base64, path)
    if data_uri is None:
        raise HTTPException(status_code=404, detail="Could not generate thumbnail")

    return {"image_id": image_id, "data_uri": data_uri}
