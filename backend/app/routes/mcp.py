import logging
import os
from typing import Any
from fastapi import APIRouter, Request
from mcp.server import Server
from mcp.server.sse import SseServerTransport
from mcp.types import TextContent, Tool, CallToolResult
from ..core import db
from ..core.config import get_settings
from ..services.task_extraction import TaskExtractionService
from ..services.text_cleaning import TextCleaningService
from ..prompts.prompt_registry import build_default_registry

logger = logging.getLogger("mcp")
settings = get_settings()

router = APIRouter(prefix="/mcp", tags=["mcp"])
mcp_server = Server("TaskWhisper-Intelligence-Server")

@mcp_server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="extract_tasks",
            description="Analyze text to extract actionable tasks and milestones.",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "The raw text or transcript to analyze"},
                    "prompt_id": {"type": "string", "description": "Style of extraction (base, notion, checklist)", "default": "task_extraction_notion"}
                },
                "required": ["text"]
            }
        ),
        Tool(
            name="clean_transcript",
            description="Remove filler words and improve readability of raw speech transcripts.",
            inputSchema={
                "type": "object",
                "properties": {
                    "transcript": {"type": "string", "description": "The raw STT output"},
                    "prompt_id": {"type": "string", "description": "Cleanup prompt version", "default": "cleanup_base"}
                },
                "required": ["transcript"]
            }
        ),
        Tool(
            name="translate_content",
            description="Translate text or tasks to a target language.",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to translate"},
                    "target_language": {"type": "string", "description": "ISO language code or name"},
                    "prompt_id": {"type": "string", "description": "Translation prompt version", "default": "translation_base"}
                },
                "required": ["text", "target_language"]
            }
        ),
        Tool(
            name="list_tasks",
            description="Retrieve recently created tasks from the database.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {"type": "number", "description": "Maximum number of tasks to return", "default": 20}
                }
            }
        )
    ]

@mcp_server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any], context: Any = None) -> CallToolResult:
    
    registry = build_default_registry(os.path.join(os.path.dirname(__file__), "..", "prompts"))
    extraction_service = TaskExtractionService(registry)
    text_service = TextCleaningService(registry)

    try:
        if name == "extract_tasks":
            text = arguments.get("text")
            prompt_id = arguments.get("prompt_id", "task_extraction_notion")
            if not text:
                return CallToolResult(content=[TextContent(type="text", text="Error: Text is required")], isError=True)
            result = await extraction_service.extract(text, prompt_id, {})
            return CallToolResult(content=[TextContent(type="text", text=str(result))])

        elif name == "clean_transcript":
            transcript = arguments.get("transcript")
            prompt_id = arguments.get("prompt_id", "cleanup_base")
            if not transcript:
                return CallToolResult(content=[TextContent(type="text", text="Error: Transcript is required")], isError=True)
            result = await text_service.clean(transcript, prompt_id, {})
            return CallToolResult(content=[TextContent(type="text", text=str(result))])

        elif name == "translate_content":
            text = arguments.get("text")
            target = arguments.get("target_language")
            prompt_id = arguments.get("prompt_id", "translation_base")
            if not text or not target:
                return CallToolResult(content=[TextContent(type="text", text="Error: Text and target language required")], isError=True)
            result = await text_service.translate(text, prompt_id, target, {})
            return CallToolResult(content=[TextContent(type="text", text=str(result))])

        elif name == "list_tasks":
            limit = int(arguments.get("limit", 20))
            cursor = db.get_db()["jobs"].find({"result.tasks": {"$exists": True}}).sort("created_at", -1).limit(limit)
            jobs = await cursor.to_list(length=limit)
            
            all_tasks = []
            for j in jobs:
                job_tasks = j.get("result", {}).get("tasks", [])
                for t in job_tasks:
                    t["source_job"] = str(j["_id"])
                    all_tasks.append(t)
            
            return CallToolResult(content=[TextContent(type="text", text=str(all_tasks[:limit]))])

        else:
            return CallToolResult(content=[TextContent(type="text", text=f"Unknown tool: {name}")], isError=True)
    except Exception as e:
        logger.exception("MCP tool execution failed")
        return CallToolResult(content=[TextContent(type="text", text=f"Internal Error: {str(e)}")], isError=True)

sse = SseServerTransport(f"{settings.api_prefix}/mcp/messages")

@router.get("/sse")
async def sse_endpoint(request: Request):
    async with sse.connect_sse(request.scope, request.receive, request._send) as (read_stream, write_stream):
        await mcp_server.run(read_stream, write_stream, mcp_server.create_initialization_options())

@router.post("/messages")
async def messages_endpoint(request: Request):
    await sse.handle_post_message(request.scope, request.receive, request._send)
