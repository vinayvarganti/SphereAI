from datetime import UTC, datetime
from types import SimpleNamespace
import os

# Prevent real external service API calls during testing
os.environ["CLERK_SECRET_KEY"] = "mock_secret"
os.environ["CLERK_JWKS_URL"] = "http://mock-clerk/.well-known/jwks.json"

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user
from app.core.security import UserContext
from app.main import app
from app.memory.cache import init_cache
from app.memory.document_store import init_document_store
from app.memory.vector_store import init_vector_store


class FakeRedis:
    def __init__(self):
        self.data = {}
        self.lists = {}

    async def get(self, key):
        return self.data.get(key)

    async def set(self, key, value, nx=False, ex=None):
        if nx and key in self.data:
            return False
        self.data[key] = value
        return True

    async def delete(self, key):
        self.data.pop(key, None)

    async def eval(self, script, number_of_keys, key, token):
        if self.data.get(key) == token:
            self.data.pop(key, None)
            return 1
        return 0

    async def rpush(self, key, value):
        self.lists.setdefault(key, []).append(value)

    async def ltrim(self, key, start, end):
        values = self.lists.get(key, [])
        self.lists[key] = values[start : end + 1 if end != -1 else None]

    async def expire(self, key, seconds):
        return True

    async def publish(self, channel, message):
        return 1

    async def lrange(self, key, start, end):
        values = self.lists.get(key, [])
        return values[start : end + 1 if end != -1 else None]

    async def ping(self):
        return True

    async def aclose(self):
        return None


class FakeCursor:
    def __init__(self, docs):
        self.docs = list(docs)

    def sort(self, field, direction):
        reverse = direction < 0
        self.docs.sort(key=lambda doc: doc.get(field) or datetime.min.replace(tzinfo=UTC), reverse=reverse)
        return self

    def skip(self, count):
        self.docs = self.docs[count:]
        return self

    def limit(self, count):
        self.docs = self.docs[:count]
        return self

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index >= len(self.docs):
            raise StopAsyncIteration
        item = self.docs[self._index]
        self._index += 1
        return dict(item)


class FakeCollection:
    def __init__(self):
        self.docs = {}

    def _matches(self, document, query):
        return all(document.get(key) == value for key, value in query.items())

    async def insert_one(self, document):
        self.docs[document["_id"]] = dict(document)
        return SimpleNamespace(inserted_id=document["_id"])

    async def update_one(self, query, update, upsert=False):
        for key, document in self.docs.items():
            if self._matches(document, query):
                document.update(update.get("$set", {}))
                self.docs[key] = document
                return SimpleNamespace(matched_count=1, modified_count=1)
        if upsert:
            document = {**query, **update.get("$set", {})}
            document.setdefault("_id", query.get("_id"))
            self.docs[document["_id"]] = document
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=document["_id"])
        return SimpleNamespace(matched_count=0, modified_count=0)

    async def find_one(self, query):
        for document in self.docs.values():
            if self._matches(document, query):
                return dict(document)
        return None

    def find(self, query):
        return FakeCursor([doc for doc in self.docs.values() if self._matches(doc, query)])

    async def count_documents(self, query):
        return sum(1 for document in self.docs.values() if self._matches(document, query))

    async def delete_one(self, query):
        for key, document in list(self.docs.items()):
            if self._matches(document, query):
                del self.docs[key]
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)

    async def delete_many(self, query):
        deleted = 0
        for key, document in list(self.docs.items()):
            if self._matches(document, query):
                del self.docs[key]
                deleted += 1
        return SimpleNamespace(deleted_count=deleted)


class FakeDB:
    def __init__(self):
        self.workflows = FakeCollection()
        self.companies = FakeCollection()
        self.contacts = FakeCollection()
        self.agent_logs = FakeCollection()

    async def command(self, command):
        return {"ok": 1}


@pytest.fixture
def fake_db():
    database = FakeDB()
    init_document_store(database)
    return database


@pytest.fixture
def fake_redis():
    redis = FakeRedis()
    init_cache(redis)
    return redis


@pytest.fixture
def client(fake_db, fake_redis):
    init_vector_store(None, None)
    app.dependency_overrides[get_current_user] = lambda: UserContext(
        user_id="user_test",
        email="test@example.com",
        roles=["admin"],
    )
    with TestClient(app) as test_client:
        init_document_store(fake_db)
        init_cache(fake_redis)
        yield test_client
    app.dependency_overrides.clear()
