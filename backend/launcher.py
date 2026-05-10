"""PyInstaller entry point. Spawns the FastAPI backend via uvicorn."""
import os
import sys


def _resolve_cwd():
    """Return a writable working directory for DB, backups, and .env."""
    # Use the directory containing the .exe (portable mode) or user data
    if getattr(sys, "frozen", False):
        # PyInstaller --onefile: work next to the .exe so users can find .env / cache.db
        return os.path.dirname(sys.executable)
    # Development: use the backend project root
    return os.path.dirname(__file__)


def main():
    cwd = _resolve_cwd()
    os.chdir(cwd)

    port = int(os.environ.get("BACKEND_PORT", "18903"))

    # Import app directly — string "main:app" breaks under PyInstaller
    from main import app  # noqa: E402  (import after chdir so paths resolve)
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
