import json
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any

from redis import Redis
from redis.asyncio import Redis as AsyncRedis
from redis.exceptions import TimeoutError as RedisTimeoutError

from core.config import get_settings


STREAM_TTL_IN_SECONDS = 3600

READ_BLOCK_IN_MILLISECONDS = 10_000

SOCKET_TIMEOUT_IN_SECONDS = 30.0


class RedisStreamClient:
    def __init__(self, url: str) -> None:
        """
        Carry short-lived event streams (one per job) from a worker to the API on Redis Streams, replayable from the start for late or reconnecting readers.

        Args:
            url (str): Redis URL on the cache database.
        """
        self._url = url
        self._redis = Redis.from_url(url, decode_responses=True)

    def publish(self, stream: str, event: str, data: dict[str, Any]) -> str:
        """
        Append one event to a stream and keep the stream an hour.

        Args:
            stream (str): Stream key.
            event (str): Event name.
            data (dict[str, Any]): JSON payload.

        Returns:
            str: The event id.
        """
        event_id = self._redis.xadd(stream, {"event": event, "data": json.dumps(data, ensure_ascii=False)})
        self._redis.expire(stream, STREAM_TTL_IN_SECONDS)
        return str(event_id)

    def set_value(self, key: str, value: str) -> None:
        """
        Store a short-lived value next to the streams.

        Args:
            key (str): Key.
            value (str): Value.
        """
        self._redis.set(key, value, ex=STREAM_TTL_IN_SECONDS)

    async def get_value(self, key: str) -> str | None:
        """
        Read a short-lived value without blocking the event loop.

        Args:
            key (str): Key.

        Returns:
            str | None: The value, or None.
        """
        async with AsyncRedis.from_url(self._url, decode_responses=True) as client:
            return await client.get(key)

    async def read(self, stream: str, last_id: str) -> AsyncIterator[tuple[str, str, str] | None]:
        """
        Read a stream from after an event id, forever; yields None after each quiet period so the caller can send a keep-alive.

        Args:
            stream (str): Stream key.
            last_id (str): Last event id seen, "0" for the start.

        Yields:
            tuple[str, str, str] | None: Event id, name and JSON data, or None when nothing came.
        """
        async with AsyncRedis.from_url(self._url, decode_responses=True, socket_timeout=SOCKET_TIMEOUT_IN_SECONDS) as client:
            cursor = last_id
            while True:
                try:
                    answer = await client.xread({stream: cursor}, block=READ_BLOCK_IN_MILLISECONDS, count=50)
                except RedisTimeoutError:
                    answer = None
                if not answer:
                    yield None
                    continue
                for event_id, fields in answer[0][1]:
                    cursor = event_id
                    yield event_id, fields["event"], fields["data"]


@lru_cache
def get_redis_stream_client() -> RedisStreamClient:
    """
    Build the shared stream client once.

    Returns:
        RedisStreamClient: The client.
    """
    return RedisStreamClient(get_settings().redis_cache_url)
