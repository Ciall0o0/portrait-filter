"""Config API — read and persist settings to .env file."""
import logging
from pathlib import Path

from fastapi import APIRouter

from config import settings
from services.openai_service import OpenAIService

logger = logging.getLogger(__name__)
router = APIRouter()

# Use CWD so .env lives next to the exe (portable mode) or in backend dir (dev).
ENV_FILE = Path(".").resolve() / ".env"

# Mapping from .env key → Settings attribute name for fields that persist to disk
_KEY_MAP: dict[str, str] = {
    "OPENAI_API_KEY": "openai_api_key",
    "OPENAI_BASE_URL": "openai_base_url",
    "OPENAI_MODEL": "openai_model",
    "OPENAI_JSON_MODE": "openai_json_mode",
}
_PERSIST_FIELDS: list[str] = list(_KEY_MAP.values())


def _write_env(updates: dict) -> None:
    """Persist config updates to .env file (create if missing)."""
    ENV_FILE.touch(exist_ok=True)
    lines = ENV_FILE.read_text().splitlines()
    new_lines = []
    seen: set[str] = set()
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            key = stripped.split("=", 1)[0].strip()
            if key in _KEY_MAP and _KEY_MAP[key] in updates:
                val = updates[_KEY_MAP[key]]
                new_lines.append(f"{key}={val}")
                seen.add(key)
                continue
        new_lines.append(line)
    for key, field in _KEY_MAP.items():
        if key not in seen and field in updates:
            new_lines.append(f"{key}={updates[field]}")
    ENV_FILE.write_text("\n".join(new_lines) + "\n")


@router.post("/test")
async def test_connection(params: dict):
    """Test the OpenAI-compatible API connection with the given credentials."""
    try:
        ok = await OpenAIService.test_connection(
            base_url=params.get("openai_base_url", settings.openai_base_url),
            api_key=params.get("openai_api_key") or settings.openai_api_key,
            model=params.get("openai_model", settings.openai_model),
        )
        return {"ok": ok} if ok else {"ok": False, "error": "API 返回了错误响应"}
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:
        logger.exception("Connection test failed")
        return {"ok": False, "error": f"连接失败: {e}"}


@router.get("")
async def get_config():
    return {
        "openai_base_url": settings.openai_base_url,
        "openai_api_key": "***" if settings.openai_api_key else "",
        "openai_model": settings.openai_model,
        "openai_json_mode": settings.openai_json_mode,
        "batch_size": settings.batch_size,
        "quality_threshold_good": settings.quality_threshold_good,
        "quality_threshold_warn": settings.quality_threshold_warn,
        "has_api_key": bool(settings.openai_api_key),
    }


@router.put("")
async def update_config(updates: dict):
    env_updates: dict[str, str] = {}

    for field in _PERSIST_FIELDS:
        if field in updates and updates[field]:
            setattr(settings, field, updates[field])
            env_updates[field] = updates[field]

    if "batch_size" in updates:
        settings.batch_size = int(updates["batch_size"])
    if "quality_threshold_good" in updates:
        settings.quality_threshold_good = float(updates["quality_threshold_good"])
    if "quality_threshold_warn" in updates:
        settings.quality_threshold_warn = float(updates["quality_threshold_warn"])
    if "openai_json_mode" in updates:
        val = updates["openai_json_mode"]
        if not isinstance(val, bool):
            val = str(val).lower() in ("true", "1", "yes")
        settings.openai_json_mode = val
        env_updates["openai_json_mode"] = str(val).lower()

    if env_updates:
        try:
            _write_env(env_updates)
        except OSError:
            logger.exception("Failed to persist settings to %s", ENV_FILE)

    return {"status": "ok"}
