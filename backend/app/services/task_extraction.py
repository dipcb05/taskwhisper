import json
from typing import Any

from .llm_client import run_llm_prompt
from ..prompts.prompt_registry import PromptRegistry
from ..utils.errors import ServiceError


class TaskExtractionService:
    def __init__(self, registry: PromptRegistry):
        self.registry = registry

    async def extract(self, text: str, prompt_id: str, options: dict[str, Any]) -> dict[str, Any]:
        payload = await run_llm_prompt(
            prompt_id,
            self.registry,
            options | {"transcript": text, "style": "notion", "response_format": "json"},
        )
        parsed = self._parse_json_payload(payload)
        tasks = [self._normalize_task(task, index) for index, task in enumerate(parsed.get("tasks", []), start=1)]
        return {"tasks": tasks, "summary": parsed.get("summary")}

    @staticmethod
    def _parse_json_payload(payload: str) -> dict[str, Any]:
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            start = payload.find("{")
            end = payload.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(payload[start : end + 1])
                except json.JSONDecodeError:
                    pass
        raise ServiceError(
            stage="task_extraction",
            message="LLM returned invalid JSON for task extraction",
            code="invalid_json",
            provider_response=payload,
        )

    @staticmethod
    def _normalize_task(task: dict[str, Any], index: int) -> dict[str, Any]:
        if not isinstance(task, dict):
            return {
                "id": f"task-{index}",
                "text": str(task),
                "completed": False,
                "priority": "medium",
                "due_date": None,
                "description": None,
                "tags": [],
                "project": None,
            }

        priority = task.get("priority")
        if priority not in {"low", "medium", "high"}:
            priority = "medium"

        return {
            "id": str(task.get("id") or f"task-{index}"),
            "text": str(task.get("title") or task.get("text") or "Untitled task"),
            "completed": False,
            "priority": priority,
            "due_date": task.get("due_date"),
            "description": task.get("description"),
            "tags": task.get("tags") if isinstance(task.get("tags"), list) else [],
            "project": task.get("project"),
        }
