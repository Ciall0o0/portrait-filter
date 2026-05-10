from fastapi import APIRouter, Query

from db.cache_repo import get_all_cached_for_folder
from services.export_service import generate_csv_report, generate_json_report

router = APIRouter()


@router.get("/report")
async def export_report(
    folder: str = Query(..., description="Folder path"),
    format: str = Query("csv", description="Export format: csv or json"),
):
    results = await get_all_cached_for_folder(folder)

    if format == "csv":
        content = generate_csv_report(results, folder)
        return {"data": content, "format": "csv", "filename": f"portrait_quality_report.csv"}
    else:
        content = generate_json_report(results, folder)
        return {"data": content, "format": "json", "filename": f"portrait_quality_report.json"}
