import base64
import hashlib
import io
import logging
from pathlib import Path

from PIL import Image

from config import settings

logger = logging.getLogger(__name__)


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


def image_to_base64_bytes(raw: bytes) -> str:
    return f"data:image/jpeg;base64,{base64.b64encode(raw).decode()}"


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


def _thumbnail_cache_path(file_path: str, size: int) -> Path:
    """Return a cache path for a thumbnail based on file path hash and size."""
    key = hashlib.sha256(f"{file_path}:{size}".encode()).hexdigest()
    cache_dir = Path(".thumb_cache")
    cache_dir.mkdir(exist_ok=True)
    return cache_dir / key


def generate_thumbnail_base64(file_path: str, size: int | None = None) -> str | None:
    if size is None:
        size = settings.thumbnail_size

    # Check disk cache
    cache_path = _thumbnail_cache_path(file_path, size)
    file_mtime = Path(file_path).stat().st_mtime if Path(file_path).exists() else 0
    if cache_path.exists():
        try:
            cached = cache_path.read_bytes()
            if len(cached) > 0:
                return base64.b64encode(cached).decode()
        except OSError:
            cache_path.unlink(missing_ok=True)

    # Generate thumbnail
    try:
        img = Image.open(file_path)
        img = img.convert("RGB")
        img.thumbnail((size, size), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        img.close()
        raw = buf.getvalue()

        # Save to disk cache
        try:
            cache_path.write_bytes(raw)
        except OSError:
            pass  # cache write failure is non-critical

        return image_to_base64_bytes(raw)
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
                    logger.warning("Permission denied scanning subdir: %s", item)
                result["subdirs"].append({
                    "name": item.name,
                    "path": str(item.resolve()),
                    "has_images": has_images,
                })
    except PermissionError:
        logger.warning("Permission denied accessing: %s", folder_path)

    return result
