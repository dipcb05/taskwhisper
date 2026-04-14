import asyncio
import hashlib
import json
from typing import Any

from ..core.cache import cache

from ..prompts.prompt_registry import PromptRegistry
from ..utils.errors import ServiceError


class LLMClient:
    def __init__(self, provider: str = "openai"):
        self.provider = provider

    async def generate(self, prompt: str, options: dict[str, Any]) -> str:
        await asyncio.sleep(0.05)
        if options.get("require_api_key") and not options.get("api_key"):
            raise ServiceError(stage="llm", message="Missing API key", code="missing_api_key")
        # Stubbed LLM output echoes options to make the API deterministic in dev
        return f"[{self.provider} synthetic response] {prompt[:80]} ..."


async def run_llm_prompt(prompt_id: str, registry: PromptRegistry, options: dict[str, Any]) -> str:
    prompt = await registry.load_prompt(prompt_id)
    key_payload = json.dumps({"prompt_id": prompt_id, "options": options}, sort_keys=True)
    cache_key = f"llm:{hashlib.sha256(key_payload.encode()).hexdigest()}"
    cached = None
    if cache.client:
        cached = await cache.get_json(cache_key)
    if cached:
        return cached
    client = LLMClient(provider=options.get("provider", "openai"))
    output = await client.generate(prompt, options)
    if cache.client:
        await cache.set_json(cache_key, output, ex=600)
    return output
