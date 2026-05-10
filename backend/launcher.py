"""PyInstaller entry point. Spawns the FastAPI backend via uvicorn."""
import os
import uvicorn


def main():
    port = int(os.environ.get("BACKEND_PORT", "18903"))
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
