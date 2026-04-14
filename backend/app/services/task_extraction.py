from typing import Any

from .llm_client import run_llm_prompt
from ..prompts.prompt_registry import PromptRegistry


class TaskExtractionService:
    def __init__(self, registry: PromptRegistry):
        self.registry = registry

    async def extract(self, text: str, prompt_id: str, options: dict[str, Any]) -> dict[str, Any]:
        payload = await run_llm_prompt(prompt_id, self.registry, options | {"text": text})
        # In production, parse JSON; here we mock structured payload
        return {"tasks": [{"title": "Sample task", "description": payload}], "summary": f"Summary: {payload[:80]}"}
