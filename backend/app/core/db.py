import asyncio
import copy
import json
import os
import uuid
from datetime import datetime
from typing import Any, AsyncIterator

from .config import get_settings


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    return value


def _deep_copy(value: Any) -> Any:
    return copy.deepcopy(value)


def _get_path(document: dict[str, Any], path: str) -> Any:
    current: Any = document
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def _path_exists(document: dict[str, Any], path: str) -> bool:
    current: Any = document
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return True


def _set_path(document: dict[str, Any], path: str, value: Any) -> None:
    current = document
    parts = path.split(".")
    for part in parts[:-1]:
        child = current.get(part)
        if not isinstance(child, dict):
            child = {}
            current[part] = child
        current = child
    current[parts[-1]] = _serialize(value)


def _push_path(document: dict[str, Any], path: str, value: Any) -> None:
    current = document
    parts = path.split(".")
    for part in parts[:-1]:
        child = current.get(part)
        if not isinstance(child, dict):
            child = {}
            current[part] = child
        current = child
    existing = current.get(parts[-1])
    if not isinstance(existing, list):
        existing = []
        current[parts[-1]] = existing
    existing.append(_serialize(value))


def _matches(document: dict[str, Any], query: dict[str, Any]) -> bool:
    for key, expected in query.items():
        if isinstance(expected, dict) and "$exists" in expected:
            if _path_exists(document, key) != bool(expected["$exists"]):
                return False
            continue
        actual = _get_path(document, key)
        if actual != expected:
            return False
    return True


class InsertOneResult:
    def __init__(self, inserted_id: str) -> None:
        self.inserted_id = inserted_id


class LocalCursor:
    def __init__(self, documents: list[dict[str, Any]]) -> None:
        self._documents = [_deep_copy(doc) for doc in documents]
        self._limit: int | None = None

    def sort(self, key: str, direction: int) -> "LocalCursor":
        reverse = direction < 0
        self._documents.sort(key=lambda item: _get_path(item, key) or "", reverse=reverse)
        return self

    def limit(self, value: int) -> "LocalCursor":
        self._limit = value
        return self

    async def to_list(self, length: int | None = None) -> list[dict[str, Any]]:
        docs = self._documents
        if self._limit is not None:
            docs = docs[: self._limit]
        if length is not None:
            docs = docs[:length]
        return [_deep_copy(doc) for doc in docs]

    def __aiter__(self) -> AsyncIterator[dict[str, Any]]:
        documents = self._documents
        if self._limit is not None:
            documents = documents[: self._limit]

        async def generator() -> AsyncIterator[dict[str, Any]]:
            for document in documents:
                yield _deep_copy(document)

        return generator()


class LocalCollection:
    def __init__(self, database: "LocalDatabase", name: str) -> None:
        self._database = database
        self._name = name

    async def insert_one(self, document: dict[str, Any]) -> InsertOneResult:
        async with self._database.lock:
            payload = _serialize(_deep_copy(document))
            payload["_id"] = payload.get("_id") or uuid.uuid4().hex
            collection = self._database.data.setdefault(self._name, [])
            collection.append(payload)
            await self._database.flush()
            return InsertOneResult(payload["_id"])

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        async with self._database.lock:
            for document in self._database.data.setdefault(self._name, []):
                if _matches(document, query):
                    return _deep_copy(document)
        return None

    def find(self, query: dict[str, Any]) -> LocalCursor:
        documents = [doc for doc in self._database.data.setdefault(self._name, []) if _matches(doc, query)]
        return LocalCursor(documents)

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> None:
        async with self._database.lock:
            collection = self._database.data.setdefault(self._name, [])
            target = next((doc for doc in collection if _matches(doc, query)), None)
            created = False
            if target is None and upsert:
                target = _serialize(_deep_copy(query))
                target["_id"] = target.get("_id") or uuid.uuid4().hex
                collection.append(target)
                created = True
            if target is None:
                return

            for key, value in update.get("$set", {}).items():
                _set_path(target, key, value)
            for key, value in update.get("$push", {}).items():
                _push_path(target, key, value)
            if created:
                for key, value in update.get("$setOnInsert", {}).items():
                    _set_path(target, key, value)

            await self._database.flush()

    async def create_index(self, *args: Any, **kwargs: Any) -> None:
        return None


class LocalDatabase:
    def __init__(self, path: str) -> None:
        self.path = path
        self.lock = asyncio.Lock()
        self.data: dict[str, list[dict[str, Any]]] = {}

    async def load(self) -> None:
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        if not os.path.exists(self.path):
            self.data = {}
            await self.flush()
            return
        self.data = await asyncio.to_thread(self._read_file)

    async def flush(self) -> None:
        await asyncio.to_thread(self._write_file, self.data)

    def _read_file(self) -> dict[str, list[dict[str, Any]]]:
        with open(self.path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write_file(self, payload: dict[str, list[dict[str, Any]]]) -> None:
        with open(self.path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)

    def __getitem__(self, name: str) -> LocalCollection:
        return LocalCollection(self, name)


database: LocalDatabase | None = None


async def connect() -> None:
    global database
    settings = get_settings()
    database = LocalDatabase(settings.local_db_path)
    await database.load()


async def close() -> None:
    return None


def get_db() -> LocalDatabase:
    if database is None:
        raise RuntimeError("Database not initialized")
    return database


async def ensure_indexes() -> None:
    return None


async def connect_to_mongo() -> None:
    await connect()


async def close_mongo_connection() -> None:
    await close()
