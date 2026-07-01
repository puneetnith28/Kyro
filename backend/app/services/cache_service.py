import os
import json
from typing import Any, Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Cache Keys
KEY_ACTIVITY = "kyro:analytics:activity"
KEY_CLUSTERS = "kyro:analytics:clusters"
KEY_REPORT   = "kyro:analytics:report"

# TTLs in seconds
TTL_ACTIVITY = 300   # 5 minutes
TTL_CLUSTERS = 1800  # 30 minutes
TTL_REPORT   = 3600  # 1 hour

class CacheService:
    """
    Singleton Redis cache service with graceful degradation.
    If Redis is unavailable, it operates as a no-op (passthrough),
    ensuring the application never crashes due to a cache failure.
    """
    def __init__(self):
        self.redis = None
        self._connected = False

    async def connect(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            # We attempt to import redis dynamically so if it's missing, it fails gracefully
            import redis.asyncio as redis_async
            self.redis = redis_async.from_url(redis_url, decode_responses=True)
            # Ping to verify connection
            await self.redis.ping()
            self._connected = True
            logger.info(f"✅ Connected to Redis at {redis_url}")
        except ImportError:
            logger.warning("Redis library not installed. Caching disabled.")
            self._connected = False
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Running without cache.")
            self._connected = False

    async def disconnect(self):
        if self._connected and self.redis:
            await self.redis.close()
            self._connected = False

    async def get(self, key: str) -> Optional[Any]:
        if not self._connected:
            return None
        try:
            val = await self.redis.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
        return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        if not self._connected:
            return False
        try:
            await self.redis.set(key, json.dumps(value), ex=ttl)
            return True
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False

    async def invalidate(self, key: str) -> bool:
        if not self._connected:
            return False
        try:
            await self.redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DEL error: {e}")
            return False

# Export a singleton instance
cache = CacheService()
