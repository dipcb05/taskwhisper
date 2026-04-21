from typing import Any, Protocol


class ExportResult:
    def __init__(self, success: bool, detail: str, external_id: str | None = None):
        self.success = success
        self.detail = detail
        self.external_id = external_id

    def dict(self) -> dict[str, Any]:
        return {"success": self.success, "detail": self.detail, "external_id": self.external_id}


class ConnectorField:
    def __init__(
        self,
        key: str,
        label: str,
        *,
        required: bool = True,
        secret: bool = False,
        oauth_managed: bool = False,
        placeholder: str | None = None,
        help_text: str | None = None,
    ) -> None:
        self.key = key
        self.label = label
        self.required = required
        self.secret = secret
        self.oauth_managed = oauth_managed
        self.placeholder = placeholder
        self.help_text = help_text

    def dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "required": self.required,
            "secret": self.secret,
            "oauth_managed": self.oauth_managed,
            "placeholder": self.placeholder,
            "help_text": self.help_text,
        }


class BaseExportConnector(Protocol):
    provider: str
    display_name: str
    description: str
    fields: list[ConnectorField]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        ...

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        ...
