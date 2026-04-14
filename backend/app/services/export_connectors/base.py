from typing import Any, Protocol


class ExportResult:
    def __init__(self, success: bool, detail: str, external_id: str | None = None):
        self.success = success
        self.detail = detail
        self.external_id = external_id

    def dict(self) -> dict[str, Any]:
        return {"success": self.success, "detail": self.detail, "external_id": self.external_id}


class BaseExportConnector(Protocol):
    provider: str

    async def prepare_payload(self, tasks: list[dict[str, Any]]) -> Any:
        ...

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        ...
