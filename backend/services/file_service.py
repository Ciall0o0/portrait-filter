import base64
import hashlib
import io
from pathlib import Path

from PIL import Image

from config import settings


def compute_sha256(file_path: Path) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def image_to_base64(img: Image.Image, quality: int = 85) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"


def _read_metadata(file_path: Path) -> dict:
    stat = file_path.stat()
    img = Image.open(file_path)
    width, height = img.size
    img_format = img.format or file_path.suffix.upper().lstrip(".")
    img.close()
    return {
        "id": compute_sha256(file_path),
        "path": str(file_path.resolve()),
        "filename": file_path.name,
        "size_bytes": stat.st_size,
        "width": width,
        "height": height,
        "format": img_format,
    }


def scan_folder(folder_path: str) -> list[dict]:
    folder = Path(folder_path)
    ext_set = {ext.lower() for ext in settings.supported_extensions}
    images = []
    try:
        for file_path in folder.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in ext_set:
                try:
                    images.append(_read_metadata(file_path))
                except Exception:
                    pass
    except (FileNotFoundError, PermissionError):
        pass
    return images


def generate_thumbnail_base64(file_path: str, size: int | None = None) -> str | None:
    if size is None:
        size = settings.thumbnail_size
    try:
        img = Image.open(file_path)
        img = img.convert("RGB")
        img.thumbnail((size, size), Image.LANCZOS)
        result = image_to_base64(img, quality=80)
        img.close()
        return result
    except Exception:
        return None


def get_image_info_dict(file_path: str) -> dict | None:
    try:
        return _read_metadata(Path(file_path))
    except (FileNotFoundError, OSError):
        return None


def browse_parent_folder(folder_path: str) -> dict:
    target = Path(folder_path).resolve()
    ext_set = {ext.lower() for ext in settings.supported_extensions}

    result = {
        "current": str(target),
        "exists": target.is_dir(),
        "parent": str(target.parent) if target.parent != target else None,
        "subdirs": [],
    }

    try:
        for item in sorted(target.iterdir()):
            if item.is_dir() and not item.name.startswith("."):
                has_images = False
                try:
                    has_images = any(
                        f.is_file() and f.suffix.lower() in ext_set
                        for f in item.iterdir()
                    )
                except PermissionError:
                    pass
                result["subdirs"].append({
                    "name": item.name,
                    "path": str(item.resolve()),
                    "has_images": has_images,
                })
    except PermissionError:
        pass

    return result
