from __future__ import annotations

from datetime import datetime
from typing import Any
from urllib.parse import quote

import httpx

from .base import BaseExportConnector, ConnectorField, ExportResult

NOTION_API_URL = "https://api.notion.com/v1/pages"
SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage"
GOOGLE_TASKS_INSERT_URL = "https://tasks.googleapis.com/tasks/v1/lists/{tasklist}/tasks"
GOOGLE_KEEP_CREATE_URL = "https://keep.googleapis.com/v1/notes"
MICROSOFT_TODO_CREATE_URL = "https://graph.microsoft.com/v1.0/me/todo/lists/{list_id}/tasks"
MICROSOFT_ONENOTE_CREATE_URL = "https://graph.microsoft.com/v1.0/me/onenote/pages"


def _note_title(note: dict[str, Any], fallback: str) -> str:
    title = note.get("title")
    return title if isinstance(title, str) and title.strip() else fallback


def _task_rows(notes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for note in notes:
        note_title = _note_title(note, "TaskWhisper Recording")
        note_id = str(note.get("id") or "")
        transcript = str(note.get("cleaned_text") or note.get("raw_transcription") or "").strip()
        tasks = note.get("tasks") if isinstance(note.get("tasks"), list) else []
        for index, task in enumerate(tasks):
            task_data = task if isinstance(task, dict) else {}
            text = str(task_data.get("text") or task_data.get("title") or f"Task {index + 1}")
            rows.append(
                {
                    "title": text,
                    "description": transcript[:1200],
                    "priority": task_data.get("priority") or "medium",
                    "due_date": task_data.get("due_date") or task_data.get("dueDate"),
                    "completed": bool(task_data.get("completed")),
                    "note_title": note_title,
                    "note_id": note_id,
                }
            )
    return rows


def _note_summaries(notes: list[dict[str, Any]]) -> list[dict[str, str]]:
    summaries: list[dict[str, str]] = []
    for note in notes:
        title = _note_title(note, "TaskWhisper Recording")
        transcript = str(note.get("cleaned_text") or note.get("raw_transcription") or "").strip()
        tasks = note.get("tasks") if isinstance(note.get("tasks"), list) else []
        task_lines = []
        for task in tasks:
            task_data = task if isinstance(task, dict) else {}
            task_text = str(task_data.get("text") or task_data.get("title") or "").strip()
            if task_text:
                task_lines.append(f"- {task_text}")
        body_parts = []
        if transcript:
            body_parts.append(transcript[:4000])
        if task_lines:
            body_parts.append("Tasks:\n" + "\n".join(task_lines[:50]))
        summaries.append({"title": title, "body": "\n\n".join(body_parts).strip()})
    return summaries


class SimpleListConnector(BaseExportConnector):
    provider = "json_download"
    display_name = "JSON Download"
    description = "Prepare extracted tasks as JSON for download."
    fields: list[ConnectorField] = []

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _task_rows(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        return [ExportResult(success=True, detail=f"Prepared {len(payload)} tasks for download").dict()]


class NotionConnector(BaseExportConnector):
    provider = "notion"
    display_name = "Notion"
    description = "Create one page per extracted task under a target parent page."
    fields = [
        ConnectorField("api_key", "Integration token", secret=True, oauth_managed=True, placeholder="secret_...", help_text="Connected through Notion OAuth."),
        ConnectorField("page_id", "Parent page ID", placeholder="59833787-2cf9-4fdf-8782-e53db20768a5", help_text="Pages will be created as child pages here."),
    ]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _task_rows(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        token = settings.get("api_key")
        page_id = settings.get("page_id")
        if not token or not page_id:
            return [ExportResult(False, "Missing Notion token or parent page ID").dict()]

        results: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for task in payload:
                response = await client.post(
                    NOTION_API_URL,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                    json={
                        "parent": {"type": "page_id", "page_id": page_id},
                        "properties": {
                            "title": {
                                "title": [
                                    {
                                        "text": {
                                            "content": task["title"][:200],
                                        }
                                    }
                                ]
                            }
                        },
                    },
                )
                if response.status_code >= 400:
                    detail = _extract_http_detail(response)
                    results.append(ExportResult(False, f"Notion create failed: {detail}").dict())
                    continue
                body = response.json()
                results.append(ExportResult(True, "Notion page created", external_id=body.get("id")).dict())
        return results


class TodoistConnector(BaseExportConnector):
    provider = "todoist"
    display_name = "Todoist"
    description = "Create tasks in Todoist using a personal API token."
    fields = [
        ConnectorField("api_key", "API token", secret=True, oauth_managed=True, placeholder="todoist-token", help_text="Connected through Todoist OAuth."),
    ]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _task_rows(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        token = settings.get("api_key")
        if not token:
            return [ExportResult(False, "Missing Todoist token").dict()]

        results: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for task in payload:
                response = await client.post(
                    "https://api.todoist.com/rest/v2/tasks",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "content": task["title"],
                        "description": _compose_task_description(task),
                        "due_string": task["due_date"] or None,
                    },
                )
                if response.status_code >= 400:
                    results.append(ExportResult(False, f"Todoist create failed: {_extract_http_detail(response)}").dict())
                    continue
                body = response.json()
                results.append(ExportResult(True, "Todoist task created", external_id=str(body.get("id"))).dict())
        return results


class GoogleTasksConnector(BaseExportConnector):
    provider = "google_tasks"
    display_name = "Google Tasks"
    description = "Create tasks in a Google Tasks list using a user OAuth access token."
    fields = [
        ConnectorField("access_token", "Access token", secret=True, oauth_managed=True, placeholder="ya29....", help_text="Connected through Google OAuth."),
        ConnectorField("tasklist_id", "Task list ID", placeholder="@default", help_text="Use @default or a specific task list ID."),
    ]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _task_rows(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        token = settings.get("access_token")
        tasklist_id = settings.get("tasklist_id") or "@default"
        if not token:
            return [ExportResult(False, "Missing Google Tasks access token").dict()]

        results: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for task in payload:
                body: dict[str, Any] = {
                    "title": task["title"],
                    "notes": _compose_task_description(task),
                    "status": "completed" if task["completed"] else "needsAction",
                }
                if task["due_date"]:
                    body["due"] = _normalize_rfc3339_date(task["due_date"])
                response = await client.post(
                    GOOGLE_TASKS_INSERT_URL.format(tasklist=quote(tasklist_id, safe="")),
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json=body,
                )
                if response.status_code >= 400:
                    results.append(ExportResult(False, f"Google Tasks create failed: {_extract_http_detail(response)}").dict())
                    continue
                data = response.json()
                results.append(ExportResult(True, "Google task created", external_id=data.get("id")).dict())
        return results


class MicrosoftTodoConnector(BaseExportConnector):
    provider = "microsoft_todo"
    display_name = "Microsoft To Do"
    description = "Create tasks in Microsoft To Do through Microsoft Graph."
    fields = [
        ConnectorField("access_token", "Access token", secret=True, oauth_managed=True, placeholder="eyJ0eXAi...", help_text="Connected through Microsoft OAuth."),
        ConnectorField("list_id", "Task list ID", placeholder="AQMkAD...", help_text="Target To Do list identifier from Microsoft Graph."),
    ]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _task_rows(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        token = settings.get("access_token")
        list_id = settings.get("list_id")
        if not token or not list_id:
            return [ExportResult(False, "Missing Microsoft To Do access token or list ID").dict()]

        results: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for task in payload:
                body: dict[str, Any] = {
                    "title": task["title"],
                    "body": {
                        "content": _compose_task_description(task),
                        "contentType": "text",
                    },
                    "status": "completed" if task["completed"] else "notStarted",
                }
                if task["due_date"]:
                    body["dueDateTime"] = {
                        "dateTime": _normalize_graph_datetime(task["due_date"]),
                        "timeZone": "UTC",
                    }
                response = await client.post(
                    MICROSOFT_TODO_CREATE_URL.format(list_id=quote(list_id, safe="")),
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json=body,
                )
                if response.status_code >= 400:
                    results.append(ExportResult(False, f"Microsoft To Do create failed: {_extract_http_detail(response)}").dict())
                    continue
                data = response.json()
                results.append(ExportResult(True, "Microsoft To Do task created", external_id=data.get("id")).dict())
        return results


class MicrosoftOneNoteConnector(BaseExportConnector):
    provider = "microsoft_onenote"
    display_name = "Microsoft OneNote"
    description = "Create a OneNote page for each recording summary in the default notebook."
    fields = [
        ConnectorField("access_token", "Access token", secret=True, oauth_managed=True, placeholder="eyJ0eXAi...", help_text="Connected through Microsoft OAuth."),
        ConnectorField("section_name", "Section name", required=False, placeholder="TaskWhisper", help_text="Optional section in the default notebook."),
    ]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _note_summaries(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        token = settings.get("access_token")
        if not token:
            return [ExportResult(False, "Missing Microsoft OneNote access token").dict()]

        url = MICROSOFT_ONENOTE_CREATE_URL
        section_name = settings.get("section_name")
        if isinstance(section_name, str) and section_name.strip():
            url = f"{url}?sectionName={quote(section_name.strip(), safe='')}"

        results: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for note in payload:
                html = _build_onenote_page(note["title"], note["body"])
                response = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/xhtml+xml"},
                    content=html.encode("utf-8"),
                )
                if response.status_code >= 400:
                    results.append(ExportResult(False, f"OneNote page create failed: {_extract_http_detail(response)}").dict())
                    continue
                location = response.headers.get("Location")
                results.append(ExportResult(True, "OneNote page created", external_id=location).dict())
        return results


class GoogleKeepConnector(BaseExportConnector):
    provider = "google_keep"
    display_name = "Google Keep"
    description = "Create a Keep note for each recording summary using a user OAuth access token."
    fields = [
        ConnectorField("access_token", "Access token", secret=True, oauth_managed=True, placeholder="ya29....", help_text="Connected through Google OAuth."),
    ]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _note_summaries(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        token = settings.get("access_token")
        if not token:
            return [ExportResult(False, "Missing Google Keep access token").dict()]

        results: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for note in payload:
                response = await client.post(
                    GOOGLE_KEEP_CREATE_URL,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={
                        "title": note["title"],
                        "body": {
                            "text": {
                                "text": note["body"][:19000],
                            }
                        },
                    },
                )
                if response.status_code >= 400:
                    results.append(ExportResult(False, f"Google Keep create failed: {_extract_http_detail(response)}").dict())
                    continue
                data = response.json()
                results.append(ExportResult(True, "Google Keep note created", external_id=data.get("name")).dict())
        return results


class SlackConnector(BaseExportConnector):
    provider = "slack"
    display_name = "Slack"
    description = "Post recording summaries or tasks into a Slack channel."
    fields = [
        ConnectorField("bot_token", "Bot token", secret=True, oauth_managed=True, placeholder="xoxb-...", help_text="Connected through Slack OAuth."),
        ConnectorField("channel_id", "Channel ID", placeholder="C0123456789", help_text="Destination channel ID, not the channel name."),
    ]

    async def prepare_payload(self, notes: list[dict[str, Any]]) -> Any:
        return _note_summaries(notes)

    async def send(self, payload: Any, settings: dict[str, Any]) -> list[ExportResult]:
        token = settings.get("bot_token")
        channel_id = settings.get("channel_id")
        if not token or not channel_id:
            return [ExportResult(False, "Missing Slack bot token or channel ID").dict()]

        results: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for note in payload:
                response = await client.post(
                    SLACK_POST_MESSAGE_URL,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"},
                    json={
                        "channel": channel_id,
                        "text": f"{note['title']}\n{note['body'][:3500]}",
                    },
                )
                data = response.json()
                if response.status_code >= 400 or not data.get("ok"):
                    detail = data.get("error") if isinstance(data, dict) else _extract_http_detail(response)
                    results.append(ExportResult(False, f"Slack post failed: {detail}").dict())
                    continue
                results.append(ExportResult(True, "Slack message posted", external_id=data.get("ts")).dict())
        return results


def get_connectors() -> dict[str, BaseExportConnector]:
    connectors: list[BaseExportConnector] = [
        SimpleListConnector(),
        NotionConnector(),
        TodoistConnector(),
        GoogleTasksConnector(),
        GoogleKeepConnector(),
        MicrosoftTodoConnector(),
        MicrosoftOneNoteConnector(),
        SlackConnector(),
    ]
    return {connector.provider: connector for connector in connectors}


def connector_catalog(oauth_catalog: dict[str, dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    catalog = []
    oauth_catalog = oauth_catalog or {}
    for connector in get_connectors().values():
        if connector.provider == "json_download":
            continue
        oauth_item = oauth_catalog.get(connector.provider, {})
        catalog.append(
            {
                "provider": connector.provider,
                "name": connector.display_name,
                "description": connector.description,
                "oauth_supported": bool(oauth_item.get("client_id") and oauth_item.get("client_secret")),
                "oauth_label": oauth_item.get("label"),
                "fields": [field.dict() for field in connector.fields],
            }
        )
    return catalog


def _compose_task_description(task: dict[str, Any]) -> str:
    parts = [f"Source note: {task['note_title']}"]
    if task.get("description"):
        parts.append(str(task["description"]))
    if task.get("priority"):
        parts.append(f"Priority: {task['priority']}")
    return "\n\n".join(parts)


def _normalize_rfc3339_date(value: str) -> str:
    if "T" in value:
        return value
    return f"{value}T00:00:00.000Z"


def _normalize_graph_datetime(value: str) -> str:
    if "T" in value:
        return value.replace("Z", "")
    return f"{value}T00:00:00"


def _build_onenote_page(title: str, body: str) -> str:
    safe_title = _escape_html(title)
    safe_body = _escape_html(body).replace("\n", "<br />")
    created = datetime.utcnow().isoformat()
    return (
        "<!DOCTYPE html>"
        "<html><head>"
        f"<title>{safe_title}</title>"
        f'<meta name="created" content="{created}" />'
        "</head><body>"
        f"<h1>{safe_title}</h1>"
        f"<p>{safe_body}</p>"
        "</body></html>"
    )


def _escape_html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _extract_http_detail(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except Exception:
        return response.text

    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str):
                return message
        if isinstance(error, str):
            return error
        message = payload.get("message")
        if isinstance(message, str):
            return message
    return str(payload)
