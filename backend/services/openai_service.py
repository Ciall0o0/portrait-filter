import asyncio
import json
from datetime import datetime
from pathlib import Path

from openai import AsyncOpenAI
from PIL import Image

from config import settings
from .file_service import image_to_base64

PORTRAIT_QUALITY_PROMPT = """You are a professional portrait photography reviewer.
Analyze the provided image and return a JSON object with these fields:
- is_portrait: boolean (true if the main subject is one or more people/faces; false for landscapes, objects, animals without people)
- overall_score: integer 0-100 (0=unusable, 100=perfect professional portrait)
- quality_issues: array of strings from this list ONLY:
  ["closed_eyes", "glare_reflection", "low_resolution", "motion_blur",
   "poor_exposure", "poor_composition", "bad_color_balance", "noise"]
- comment: string (brief 1-2 sentence explanation of findings)

Scoring guide:
- 90-100: Professional quality, sharp focus on face, excellent lighting, no issues
- 70-89: Good quality, minor issues that don't ruin the photo
- 50-69: Acceptable but with noticeable problems
- 30-49: Poor quality, multiple issues, may be unusable
- 0-29: Severely flawed, definitely should be discarded"""


class OpenAIService:
    def __init__(self):
        self._client = None
        self._client_config = None  # (url, key) tuple to detect config changes
        self.semaphore = asyncio.Semaphore(settings.concurrency_limit)
        self.min_interval = 60.0 / max(settings.rate_limit_per_min, 1)

    def _get_client(self) -> AsyncOpenAI:
        """Return a cached client. Recreate only if config changed."""
        config = (settings.openai_base_url, settings.openai_api_key)
        if self._client is None or self._client_config != config:
            if not settings.openai_api_key:
                raise ValueError("OpenAI API key is not configured")
            self._client = AsyncOpenAI(
                base_url=settings.openai_base_url,
                api_key=settings.openai_api_key,
                timeout=120.0,
                max_retries=1,
            )
            self._client_config = config
        return self._client

    async def test_connection(self, base_url: str, api_key: str, model: str) -> bool:
        """Test connectivity to the OpenAI-compatible API."""
        if not api_key:
            raise ValueError("API Key 未设置")
        client = AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=15.0)
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
            temperature=0,
        )
        return response.choices is not None and len(response.choices) > 0

    def _encode_image_sync(self, image_path: Path) -> str:
        with Image.open(image_path) as src:
            img = src.convert("RGB")
        ratio = settings.max_image_dim / max(img.width, img.height)
        if ratio < 1.0:
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        result = image_to_base64(img, quality=85)
        img.close()
        return result

    async def _encode_image(self, image_path: Path) -> str:
        return await asyncio.to_thread(self._encode_image_sync, image_path)

    @staticmethod
    def _parse_json_response(raw: str | None) -> dict | None:
        """Try to extract JSON from LLM response (may be wrapped in markdown)."""
        if not raw:
            return None
        # Direct parse
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        # Try stripping markdown code fences: ```json ... ```
        import re
        m = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
        # Try to find a JSON object anywhere in the text
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
        return None

    async def assess_single(self, image_path: str, model: str | None = None) -> dict:
        data_uri = await self._encode_image(Path(image_path))
        model_name = model or settings.openai_model

        # Build request — skip response_format for local models
        kwargs = dict(
            model=model_name,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": PORTRAIT_QUALITY_PROMPT},
                    {"type": "image_url", "image_url": {"url": data_uri, "detail": "low"}},
                ],
            }],
            max_tokens=settings.openai_max_tokens,
            temperature=settings.openai_temperature,
        )
        if settings.openai_json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        async with self.semaphore:
            client = self._get_client()
            response = await client.chat.completions.create(**kwargs)

        result_text = (response.choices[0].message.content or "").strip()

        if not result_text:
            import logging
            logging.getLogger(__name__).warning("LLM returned empty response for %s", image_path)
            return {
                "overall_score": 0, "is_portrait": False,
                "quality_issues": [], "ai_comment": "模型返回了空响应",
                "assessed_at": datetime.now().isoformat(), "error": True,
            }

        result = self._parse_json_response(result_text)
        if result is None:
            import logging
            logging.getLogger(__name__).warning(
                "LLM returned non-JSON: %.300s", result_text
            )
            return {
                "overall_score": 0, "is_portrait": False,
                "quality_issues": [],
                "ai_comment": f"模型返回了无法解析的响应: {result_text[:200]}",
                "assessed_at": datetime.now().isoformat(), "error": True,
            }

        await asyncio.sleep(self.min_interval)

        return {
            "overall_score": float(result.get("overall_score", 0)),
            "is_portrait": bool(result.get("is_portrait", False)),
            "quality_issues": result.get("quality_issues", []) or [],
            "ai_comment": str(result.get("comment", ""))[:500],
            "assessed_at": datetime.now().isoformat(),
        }
