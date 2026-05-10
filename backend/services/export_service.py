import csv
import io
import json
from pathlib import Path
from datetime import datetime


def generate_csv_report(results: list[dict], folder_path: str) -> str:
    """Generate CSV report from assessment results."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Filename", "Score", "Is Portrait", "Issues",
        "Comment", "Assessed At"
    ])
    for r in results:
        writer.writerow([
            Path(r.get("path", "")).name,
            r.get("overall_score", ""),
            r.get("is_portrait", ""),
            "; ".join(r.get("quality_issues", [])),
            r.get("ai_comment", ""),
            r.get("assessed_at", ""),
        ])
    return output.getvalue()


def generate_json_report(results: list[dict], folder_path: str) -> str:
    """Generate JSON report from assessment results."""
    return json.dumps({
        "folder": folder_path,
        "generated_at": datetime.now().isoformat(),
        "total_images": len(results),
        "results": results,
    }, ensure_ascii=False, indent=2)
