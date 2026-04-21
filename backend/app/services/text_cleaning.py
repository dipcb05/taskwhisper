from typing import Any

from .llm_client import run_llm_prompt
from ..prompts.prompt_registry import PromptRegistry


class TextCleaningService:
    def __init__(self, registry: PromptRegistry):
        self.registry = registry

    async def clean(self, transcript: str, prompt_id: str, options: dict[str, Any]) -> dict[str, Any]:
        output = await run_llm_prompt(prompt_id, self.registry, options | {"raw_transcript": transcript})
        return {"cleaned_text": output}

    async def translate(self, text: str, prompt_id: str, target_language: str | None, options: dict[str, Any]) -> dict[str, Any]:
        params = options | {"text": text, "target_language": target_language}
        output = await run_llm_prompt(prompt_id, self.registry, params)
        return {"translated_text": output, "target_language": target_language}
