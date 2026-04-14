import asyncio
from typing import Any


class JobEventManager:
    def __init__(self) -> None:
        self.connections: dict[str, set[Any]] = {}
        self.lock = asyncio.Lock()

    async def register(self, job_id: str, websocket: Any) -> None:
        async with self.lock:
            self.connections.setdefault(job_id, set()).add(websocket)

    async def unregister(self, job_id: str, websocket: Any) -> None:
        async with self.lock:
            if job_id in self.connections:
                self.connections[job_id].discard(websocket)
                if not self.connections[job_id]:
                    self.connections.pop(job_id, None)

    async def emit(self, job_id: str, event: dict[str, Any]) -> None:
        # send to live websockets
        websockets = list(self.connections.get(job_id, []))
        for ws in websockets:
            try:
                await ws.send_json(event)
            except Exception:
                pass
