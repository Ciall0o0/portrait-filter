from pathlib import Path

from fastapi import APIRouter

from config import settings

router = APIRouter()

# Use CWD so .env lives next to the exe (portable mode) or in backend dir (dev).
# Electron sets cwd to backendDir (dev) or userData (production).
ENV_FILE = Path(".").resolve() / ".env"


def _write_env(updates: dict):
    """Persist config updates to .env file (create if missing)."""
    if not ENV_FILE.exists():
        ENV_FILE.touch()
    lines = ENV_FILE.read_text().splitlines()
    key_map = {
        "OPENAI_API_KEY": "openai_api_key",
        "OPENAI_BASE_URL": "openai_base_url",
        "OPENAI_MODEL": "openai_model",
    }
    new_lines = []
    seen = set()
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            key = stripped.split("=", 1)[0].strip()
            if key in key_map and key_map[key] in updates:
                val = updates[key_map[key]]
                new_lines.append(f"{key}={val}")
                seen.add(key)
                continue
        new_lines.append(line)
    for key, field in key_map.items():
        if key not in seen and field in updates:
            new_lines.append(f"{key}={updates[field]}")
    ENV_FILE.write_text("\n".join(new_lines) + "\n")


@router.get("")
async def get_config():
    return {
        "openai_base_url": settings.openai_base_url,
        "openai_api_key": "***" if settings.openai_api_key else "",
        "openai_model": settings.openai_model,
        "batch_size": settings.batch_size,
        "quality_threshold_good": settings.quality_threshold_good,
        "quality_threshold_warn": settings.quality_threshold_warn,
        "has_api_key": bool(settings.openai_api_key),
    }


@router.put("")
async def update_config(updates: dict):
    env_updates = {}

    if "openai_api_key" in updates and updates["openai_api_key"]:
        settings.openai_api_key = updates["openai_api_key"]
        env_updates["openai_api_key"] = updates["openai_api_key"]

    if "openai_base_url" in updates and updates["openai_base_url"]:
        settings.openai_base_url = updates["openai_base_url"]
        env_updates["openai_base_url"] = updates["openai_base_url"]

    if "openai_model" in updates and updates["openai_model"]:
        settings.openai_model = updates["openai_model"]
        env_updates["openai_model"] = updates["openai_model"]

    if "batch_size" in updates:
        settings.batch_size = int(updates["batch_size"])
    if "quality_threshold_good" in updates:
        settings.quality_threshold_good = float(updates["quality_threshold_good"])
    if "quality_threshold_warn" in updates:
        settings.quality_threshold_warn = float(updates["quality_threshold_warn"])

    if env_updates:
        try:
            _write_env(env_updates)
        except Exception:
            pass

    return {"status": "ok"}
