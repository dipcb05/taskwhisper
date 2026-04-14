import asyncio
from typing import Any

from .base import BaseExportConnector, ExportResult


class SimpleListConnector(BaseExportConnector):
    provider = "json_download"

    async def prepare_payload(self, tasks: list[dict[str, Any]]) -> Any:
        return tasks

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        await asyncio.sleep(0.01)
        return [ExportResult(success=True, detail="Prepared for download").dict()]


class NotionConnector(BaseExportConnector):
    provider = "notion"

    async def prepare_payload(self, tasks: list[dict[str, Any]]) -> Any:
        return [{"properties": task} for task in tasks]

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        await asyncio.sleep(0.05)
        token = settings.get("api_key")
        if not token:
            return [ExportResult(False, "Missing Notion token").dict()]
        return [ExportResult(True, "Notion stub success", external_id="notion-123").dict() for _ in payload]


class TodoistConnector(BaseExportConnector):
    provider = "todoist"

    async def prepare_payload(self, tasks: list[dict[str, Any]]) -> Any:
        return [{"content": task["title"], "description": task.get("description")} for task in tasks]

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        await asyncio.sleep(0.05)
        if not settings.get("api_key"):
            return [ExportResult(False, "Missing Todoist token").dict()]
        return [ExportResult(True, "Todoist mock created", external_id="todoist-1").dict() for _ in payload]


def get_connectors() -> dict[str, BaseExportConnector]:
    connectors: list[BaseExportConnector] = [
        SimpleListConnector(),
        NotionConnector(),
        TodoistConnector(),
    ]
    return {c.provider: c for c in connectors}
