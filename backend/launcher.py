"""PyInstaller entry point. Spawns the FastAPI backend via uvicorn."""
import os


def main():
    # Do NOT chdir — respect the CWD set by the parent process.
    # - Electron production: cwd = app.getPath("userData") (persistent, writable)
    # - Electron dev:       cwd = backendDir (the backend source tree)
    # .env / cache.db / .trash_backup are all resolved relative to CWD.
    port = int(os.environ.get("BACKEND_PORT", "18903"))

    # Import app directly — string "main:app" breaks under PyInstaller
    from main import app
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
