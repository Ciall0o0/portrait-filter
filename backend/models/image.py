from typing import Literal

from pydantic import BaseModel
from .enums import QualityIssue


class ImageInfo(BaseModel):
    id: str
    path: str
    filename: str
    size_bytes: int
    width: int
    height: int
    format: str
    thumbnail_base64: str | None = None


class AssessmentResult(BaseModel):
    image_id: str
    overall_score: float
    is_portrait: bool
    quality_issues: list[QualityIssue]
    ai_comment: str
    assessed_at: str


class BatchRequest(BaseModel):
    image_paths: list[str]
    model: str | None = None
    force_reassess: bool = False


class BatchStatus(BaseModel):
    batch_id: str
    total: int
    completed: int
    results: list[AssessmentResult]
    status: Literal["pending", "running", "completed", "error"]


class DeleteRequest(BaseModel):
    image_ids: list[str]
    confirmed: bool = False


class DeleteResponse(BaseModel):
    op_id: str
    deleted_count: int
    deleted_paths: list[str]


class UndoResponse(BaseModel):
    op_id: str
    restored_count: int
    restored_paths: list[str]


class ConfigUpdate(BaseModel):
    openai_base_url: str | None = None
    openai_api_key: str | None = None
    openai_model: str | None = None
    batch_size: int | None = None
    quality_threshold_good: float | None = None
    quality_threshold_warn: float | None = None


class FolderBrowseRequest(BaseModel):
    path: str
