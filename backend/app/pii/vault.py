from __future__ import annotations

import json

from cryptography.fernet import Fernet
from redis import Redis

from app.config import settings


class PIIVault:
    def __init__(self, redis_client: Redis | None = None):
        self.redis = redis_client or Redis.from_url(settings.redis_url)
        self.fernet = Fernet(settings.pii_vault_encryption_key.encode())

    def _key(self, order_id: str) -> str:
        return f"vault:{order_id}"

    def store(self, order_id: str, mapping: dict[str, str]) -> None:
        encrypted = self.fernet.encrypt(json.dumps(mapping).encode())
        self.redis.setex(
            self._key(order_id),
            settings.pii_vault_ttl_seconds,
            encrypted,
        )

    def retrieve(self, order_id: str) -> dict[str, str]:
        raw = self.redis.get(self._key(order_id))
        if raw is None:
            raise KeyError(f"PII vault expired or not found: {order_id}")
        return json.loads(self.fernet.decrypt(raw).decode())

    def restore_text(self, order_id: str, text: str) -> str:
        mapping = self.retrieve(order_id)
        for placeholder, real_value in mapping.items():
            text = text.replace(placeholder, real_value)
        return text

    def delete(self, order_id: str) -> None:
        self.redis.delete(self._key(order_id))
