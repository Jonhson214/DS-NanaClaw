import hashlib
import hmac

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


def verify_shopify_hmac(body: bytes, hmac_header: str) -> bool:
    digest = hmac.new(
        settings.shopify_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(digest, hmac_header)


class HMACAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/webhooks/shopify"):
            body = await request.body()
            hmac_header = request.headers.get("X-Shopify-Hmac-SHA256", "")
            if not verify_shopify_hmac(body, hmac_header):
                raise HTTPException(status_code=401, detail="Invalid HMAC signature")
        response = await call_next(request)
        return response
