from redis import Redis

from app.config import settings


class IdempotencyLock:
    def __init__(self, ttl: int = 3600):
        self.redis = Redis.from_url(settings.redis_url)
        self.ttl = ttl

    def acquire(self, key: str) -> bool:
        return bool(self.redis.set(f"idempotent:{key}", "1", nx=True, ex=self.ttl))

    def release(self, key: str) -> None:
        self.redis.delete(f"idempotent:{key}")
