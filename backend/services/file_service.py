import base64
import hashlib
import io
import logging
from pathlib import Path

from PIL import Image

from config import settings

logger = logging.getLogger(__name__)

# Module-level constant — settings.supported_extensions never change at runtime
IMAGE_EXTENSIONS = {ext.lower() for ext in settings.supported_extensions}


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
    with Image.open(file_path) as img:
        width, height = img.size
        img_format = img.format or file_path.suffix.upper().lstrip(".")
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
    images = []
    try:
        for file_path in folder.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
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

    source_path = Path(file_path)
    cache_path = _thumbnail_cache_path(file_path, size)
    source_mtime = source_path.stat().st_mtime if source_path.exists() else 0

    # Check disk cache with mtime-based invalidation
    if cache_path.exists() and source_mtime > 0:
        try:
            cache_mtime = cache_path.stat().st_mtime
            if cache_mtime >= source_mtime:
                cached = cache_path.read_bytes()
                if len(cached) > 0:
                    return image_to_base64_bytes(cached)
        except OSError:
            cache_path.unlink(missing_ok=True)

    # Generate thumbnail
    try:
        with Image.open(source_path) as img:
            img = img.convert("RGB")
            img.thumbnail((size, size), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=80)
        raw = buf.getvalue()

        # Save to disk cache
        try:
            cache_path.write_bytes(raw)
        except OSError:
            pass  # cache write failure is non-critical

        return image_to_base64_bytes(raw)
    except Exception:
        logger.exception("Failed to generate thumbnail: %s", file_path)
        return None


def browse_parent_folder(folder_path: str) -> dict:
    target = Path(folder_path).resolve()

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
                        f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
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
