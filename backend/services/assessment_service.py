import asyncio
import uuid

from config import settings
from db import cache_repo
from services.file_service import compute_sha256
from services.openai_service import OpenAIService


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
        chunk_size = settings.batch_size

        async def process_one(path: str) -> dict | None:
            try:
                file_hash = await asyncio.to_thread(compute_sha256, path)

                if not force:
                    cached = await cache_repo.get_cached_result(file_hash, model)
                    if cached:
                        cached["image_id"] = file_hash
                        return cached

                result = await self.openai_svc.assess_single(path, model=model)
                result["image_id"] = file_hash
                await cache_repo.put_cached_result(file_hash, path, model, result)
                return result
            except Exception as e:
                import logging
                logging.getLogger(__name__).exception("Assessment failed for %s", path)
                return {
                    "image_id": await asyncio.to_thread(compute_sha256, path),
                    "overall_score": 0,
                    "is_portrait": False,
                    "quality_issues": [],
                    "ai_comment": f"评估失败: {e}",
                    "assessed_at": "",
                    "error": True,
                }

        async def process_with_progress(path: str):
            result = await process_one(path)
            async with lock:
                batch["results"].append(result)
                batch["completed"] += 1
            await progress_callback(self._status_dict(batch))

        try:
            paths = batch["image_paths"]
            # Process in chunks for true batching
            for i in range(0, len(paths), chunk_size):
                chunk = paths[i:i + chunk_size]
                tasks = [process_with_progress(p) for p in chunk]
                await asyncio.gather(*tasks)
            batch["status"] = "completed"
        except Exception:
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
