import asyncio
import logging

from fastapi import APIRouter, HTTPException

from services.file_service import scan_folder, generate_thumbnail_base64

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_images(folder: str = "", page: int = 1, per_page: int = 100):
    if not folder:
        raise HTTPException(status_code=400, detail="folder parameter is required")
    try:
        images = await asyncio.to_thread(scan_folder, folder)
    except PermissionError:
        raise HTTPException(status_code=403, detail="无权限访问此目录")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="目录不存在")
    except OSError as e:
        logger.exception("Failed to scan folder: %s", folder)
        raise HTTPException(status_code=500, detail=f"扫描目录失败: {e}")

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

    try:
        data_uri = await asyncio.to_thread(generate_thumbnail_base64, path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="图片文件不存在")
    except PermissionError:
        raise HTTPException(status_code=403, detail="无权限读取此文件")
    except OSError as e:
        logger.exception("Failed to generate thumbnail: %s", path)
        raise HTTPException(status_code=500, detail=f"生成缩略图失败: {e}")

    if data_uri is None:
        raise HTTPException(status_code=500, detail="无法解码图片，可能格式不支持或文件已损坏")

    return {"image_id": image_id, "data_uri": data_uri}
