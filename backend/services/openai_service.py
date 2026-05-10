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
        self.semaphore = asyncio.Semaphore(settings.concurrency_limit)
        self.min_interval = 60.0 / max(settings.rate_limit_per_min, 1)

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.openai_api_key:
                raise ValueError("OpenAI API key is not configured")
            self._client = AsyncOpenAI(
                base_url=settings.openai_base_url,
                api_key=settings.openai_api_key,
            )
        return self._client

    async def test_connection(self, base_url: str, api_key: str, model: str) -> bool:
        """Test connectivity to the OpenAI-compatible API."""
        if not api_key:
            raise ValueError("API Key 未设置")
        client = AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=15.0)
        # Send a minimal chat completion request to verify credentials
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

    async def assess_single(self, image_path: str) -> dict:
        async with self.semaphore:
            data_uri = await self._encode_image(Path(image_path))
            client = self._get_client()

            response = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PORTRAIT_QUALITY_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": data_uri,
                                "detail": "low",
                            },
                        },
                    ],
                }],
                response_format={"type": "json_object"},
                max_tokens=settings.openai_max_tokens,
                temperature=settings.openai_temperature,
            )

            result_text = response.choices[0].message.content
            result = json.loads(result_text)

            await asyncio.sleep(self.min_interval)

            return {
                "overall_score": float(result.get("overall_score", 0)),
                "is_portrait": bool(result.get("is_portrait", False)),
                "quality_issues": result.get("quality_issues", []),
                "ai_comment": result.get("comment", ""),
                "assessed_at": datetime.now().isoformat(),
            }
