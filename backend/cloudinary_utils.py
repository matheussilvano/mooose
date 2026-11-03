import os
import re
import time
from typing import Optional, Tuple
from urllib.parse import urlparse

import cloudinary
import cloudinary.utils

DEFAULT_SIGNED_URL_TTL_SECONDS = int(os.environ.get("CLOUDINARY_SIGNED_URL_TTL", "600"))


def infer_cloudinary_resource_type(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        path = urlparse(url).path
    except Exception:
        return None
    parts = [p for p in path.split("/") if p]
    if len(parts) >= 2 and parts[1] == "upload":
        return parts[0]
    return None


def infer_cloudinary_format(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        path = urlparse(url).path
    except Exception:
        return None
    filename = path.rsplit("/", 1)[-1]
    if "." not in filename:
        return None
    ext = filename.rsplit(".", 1)[-1].strip().lower()
    if not ext or "/" in ext:
        return None
    return ext


def derive_cloudinary_public_id(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        path = urlparse(url).path
    except Exception:
        return None
    if "/upload/" not in path:
        return None
    after = path.split("/upload/", 1)[1]
    after = after.lstrip("/")
    if after.startswith("v"):
        parts = after.split("/", 1)
        if len(parts) == 2 and parts[0][1:].isdigit():
            after = parts[1]
    if not after:
        return None
    public_id = re.sub(r"\.[^./]+$", "", after)
    return public_id or None


def build_signed_cloudinary_url(
    *,
    public_id: str,
    resource_type: Optional[str],
    delivery_type: Optional[str],
    format: Optional[str],
    ttl_seconds: Optional[int] = None,
) -> Tuple[str, int]:
    ttl = ttl_seconds if ttl_seconds is not None else DEFAULT_SIGNED_URL_TTL_SECONDS
    expires_at = int(time.time()) + ttl
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        resource_type=resource_type or "image",
        type=delivery_type or "upload",
        sign_url=True,
        expires_at=expires_at,
        secure=True,
        format=format,
    )
    return url, expires_at
