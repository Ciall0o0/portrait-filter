import asyncio
import logging
import uuid

from config import settings
from db import cache_repo
from services.file_service import compute_sha256
from services.openai_service import OpenAIService

logger = logging.getLogger(__name__)


class AssessmentService:
    def __init__(self):
        self.openai_svc = OpenAIService()
        self.active_batches: dict[str, dict] = {}
        self.max_batches = 100

    def create_batch(self, image_paths: list[str], model: str | None = None, force: bool = False) -> str:
        batch_id = str(uuid.uuid4())
        self.active_batches[batch_id] = {
            "batch_id": batch_id,
            "total": len(image_paths),
            "completed": 0,
            "results": [],
            "status": "pending",
            "image_paths": image_paths,
            "model": model or settings.openai_model,
            "force": force,
        }
        return batch_id

    async def run_batch(self, batch_id: str, progress_callback):
        batch = self.active_batches.get(batch_id)
        if not batch:
            return

        batch["status"] = "running"
        model = batch["model"]
        force = batch["force"]
        lock = asyncio.Lock()

        async def process_one(path: str) -> dict:
            file_hash = await asyncio.to_thread(compute_sha256, path)

            if not force:
                cached = await cache_repo.get_cached_result(file_hash, model)
                if cached:
                    return {**cached, "image_id": file_hash}

            try:
                result = await self.openai_svc.assess_single(path, model=model)
            except Exception as e:
                logger.exception("Assessment failed for %s", path)
                result = {
                    "overall_score": 0,
                    "is_portrait": False,
                    "quality_issues": [],
                    "ai_comment": f"评估失败: {e}",
                    "assessed_at": "",
                    "error": True,
                }

            result["image_id"] = file_hash
            # Only cache successful results
            if not result.get("error"):
                await cache_repo.put_cached_result(file_hash, path, model, result)
            return result

        async def process_with_progress(path: str):
            result = await process_one(path)
            async with lock:
                batch["results"].append(result)
                batch["completed"] += 1
            await progress_callback(self._status_dict(batch))

        try:
            paths = batch["image_paths"]
            tasks = [process_with_progress(p) for p in paths]
            # Semaphore in OpenAIService controls actual concurrency;
            # asyncio.gather launches all tasks, semaphore gates API calls.
            await asyncio.gather(*tasks)
            batch["status"] = "completed"
        except Exception:
            logger.exception("Batch %s failed", batch_id)
            batch["status"] = "error"
        finally:
            await progress_callback(self._status_dict(batch))
            self._prune_old_batches()

    def _status_dict(self, batch: dict) -> dict:
        return {
            "batch_id": batch["batch_id"],
            "total": batch["total"],
            "completed": batch["completed"],
            "results": batch["results"],
            "status": batch["status"],
        }

    def get_batch_status(self, batch_id: str) -> dict | None:
        batch = self.active_batches.get(batch_id)
        if batch:
            return self._status_dict(batch)
        return None

    def _prune_old_batches(self):
        if len(self.active_batches) > self.max_batches:
            # Remove oldest completed batches
            completed = [
                (bid, b) for bid, b in self.active_batches.items()
                if b["status"] in ("completed", "error")
            ]
            excess = len(self.active_batches) - self.max_batches
            for bid, _ in completed[:excess]:
                del self.active_batches[bid]
