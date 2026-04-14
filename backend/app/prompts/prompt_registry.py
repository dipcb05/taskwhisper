import asyncio
import json
import os
from typing import Any


class PromptRegistry:
    def __init__(self, base_path: str) -> None:
        self.base_path = base_path
        self.registry: dict[str, str] = {}
        self._lock = asyncio.Lock()

    def register(self, prompt_id: str, filename: str) -> None:
        self.registry[prompt_id] = os.path.join(self.base_path, filename)

    async def load_prompt(self, prompt_id: str) -> str:
        path = self.registry.get(prompt_id)
        if not path:
            raise FileNotFoundError(f"Prompt {prompt_id} not registered")
        async with self._lock:
            return await asyncio.to_thread(self._read_file, path)

    @staticmethod
    def _read_file(path: str) -> str:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()


def build_default_registry(base_path: str) -> PromptRegistry:
    registry = PromptRegistry(base_path)
    registry.register("cleanup_base", "cleanup_prompt.md")
    registry.register("translation_base", "translation_prompt.md")
    registry.register("task_extraction_notion", "task_extraction_prompt.md")
    registry.register("task_extraction_checklist", "task_extraction_checklist.md")
    registry.register("summarization_base", "summarization_prompt.md")
    return registry
