from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_max_tokens: int = 500
    openai_temperature: float = 0.0
    openai_json_mode: bool = True  # disable for local models that don't support response_format

    batch_size: int = 5
    concurrency_limit: int = 2
    rate_limit_per_min: int = Field(default=30, ge=1)

    thumbnail_size: int = 300
    max_image_dim: int = 2048
    supported_extensions: list[str] = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"]

    quality_threshold_good: float = 80.0
    quality_threshold_warn: float = 50.0

    db_path: str = "cache.db"
    backup_dir: str = ".trash_backup"
    backup_ttl_hours: int = 24

    server_port: int = 18903

settings = Settings()
