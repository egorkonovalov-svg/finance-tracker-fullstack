import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import httpx
from fastapi import HTTPException, status
from jose import jwt, jwk, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.verification_code import VerificationCode

logger = logging.getLogger(__name__)

MAX_VERIFICATION_ATTEMPTS = 5


# ─── Token blocklist (DB-backed) ─────────────────────────────────────────────


async def add_token_to_blocklist(
    db: AsyncSession, jti: str, user_id: UUID, expires_at: datetime
) -> None:
    from app.models.revoked_token import RevokedToken

    record = RevokedToken(jti=jti, user_id=user_id, expires_at=expires_at)
    db.add(record)
    await db.commit()


async def is_token_blocklisted(db: AsyncSession, jti: str) -> bool:
    from app.models.revoked_token import RevokedToken

    result = await db.execute(select(RevokedToken).where(RevokedToken.jti == jti))
    return result.scalar_one_or_none() is not None


# ─── Password helpers ─────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ─── JWT ───────────────────────────────────────────────────────────────────────


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    jti = secrets.token_hex(16)
    payload = {"sub": user_id, "exp": expire, "jti": jti}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# ─── Apple Sign-In verification ───────────────────────────────────────────────

APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
_apple_keys_cache: dict | None = None
_apple_keys_fetched_at: float = 0
_APPLE_KEYS_TTL = 3600


async def _fetch_apple_public_keys() -> dict:
    global _apple_keys_cache, _apple_keys_fetched_at

    now = time.monotonic()
    if _apple_keys_cache and (now - _apple_keys_fetched_at) < _APPLE_KEYS_TTL:
        return _apple_keys_cache

    async with httpx.AsyncClient() as client:
        resp = await client.get(APPLE_KEYS_URL, timeout=10)
        resp.raise_for_status()

    _apple_keys_cache = resp.json()
    _apple_keys_fetched_at = now
    return _apple_keys_cache


async def verify_apple_id_token(id_token: str) -> dict:
    if not settings.APPLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Apple auth not configured",
        )

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple ID token",
        )

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Apple ID token missing key ID",
        )

    keys_data = await _fetch_apple_public_keys()
    matching_key = None
    for key_data in keys_data.get("keys", []):
        if key_data.get("kid") == kid:
            matching_key = key_data
            break

    if not matching_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Apple ID token signed with unknown key",
        )

    public_key = jwk.construct(matching_key)

    try:
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.APPLE_CLIENT_ID,
            issuer="https://appleid.apple.com",
            options={"verify_aud": True},
        )
    except JWTError as e:
        logger.warning("Apple ID token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple ID token",
        )

    return payload


# ─── Google Sign-In verification ──────────────────────────────────────────────

GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_google_keys_cache: dict | None = None
_google_keys_fetched_at: float = 0
_GOOGLE_KEYS_TTL = 3600


async def _fetch_google_public_keys() -> dict:
    global _google_keys_cache, _google_keys_fetched_at

    now = time.monotonic()
    if _google_keys_cache and (now - _google_keys_fetched_at) < _GOOGLE_KEYS_TTL:
        return _google_keys_cache

    async with httpx.AsyncClient() as client:
        resp = await client.get(GOOGLE_KEYS_URL, timeout=10)
        resp.raise_for_status()

    _google_keys_cache = resp.json()
    _google_keys_fetched_at = now
    return _google_keys_cache


async def verify_google_id_token(id_token: str) -> dict:
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google auth not configured",
        )

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID token missing key ID",
        )

    keys_data = await _fetch_google_public_keys()
    matching_key = None
    for key_data in keys_data.get("keys", []):
        if key_data.get("kid") == kid:
            matching_key = key_data
            break

    if not matching_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID token signed with unknown key",
        )

    public_key = jwk.construct(matching_key)

    try:
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            issuer=["https://accounts.google.com", "accounts.google.com"],
        )
    except JWTError as e:
        logger.warning("Google ID token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )

    return payload


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1000000):06d}"


async def create_verification(
    db: AsyncSession, user_id: UUID, purpose: str
) -> tuple[str, str]:
    code = generate_verification_code()
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES
    )
    record = VerificationCode(
        user_id=user_id, code=code, purpose=purpose, expires_at=expires
    )
    db.add(record)
    await db.flush()
    session_id = str(record.id)
    await db.commit()
    return session_id, code


async def validate_verification_code(
    db: AsyncSession, session_id: str, code: str
) -> VerificationCode:
    result = await db.execute(
        select(VerificationCode).where(VerificationCode.id == UUID(session_id))
    )
    record = result.scalar_one_or_none()

    if not record or record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification session",
        )

    if record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired"
        )

    if record.attempts >= MAX_VERIFICATION_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please request a new code.",
        )

    if record.code != code:
        record.attempts += 1
        await db.commit()
        remaining = MAX_VERIFICATION_ATTEMPTS - record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid code. {remaining} attempt(s) remaining.",
        )

    record.used = True
    await db.commit()
    return record


DEFAULT_CATEGORIES = [
    {"name": "Зарплата", "icon": "cash", "color": "#10B981", "type": "income"},
    {"name": "Фриланс", "icon": "laptop", "color": "#6366F1", "type": "income"},
    {"name": "Инвестиции", "icon": "trending-up", "color": "#8B5CF6", "type": "income"},
    {
        "name": "Еда и напитки",
        "icon": "restaurant",
        "color": "#F59E0B",
        "type": "expense",
    },
    {"name": "Транспорт", "icon": "car", "color": "#3B82F6", "type": "expense"},
    {"name": "Покупки", "icon": "cart", "color": "#EC4899", "type": "expense"},
    {
        "name": "Развлечения",
        "icon": "game-controller",
        "color": "#F97316",
        "type": "expense",
    },
    {"name": "Здоровье", "icon": "fitness", "color": "#EF4444", "type": "expense"},
    {"name": "Счета и ЖКХ", "icon": "flash", "color": "#14B8A6", "type": "expense"},
    {"name": "Образование", "icon": "school", "color": "#0EA5E9", "type": "expense"},
    {"name": "Подарки", "icon": "gift", "color": "#D946EF", "type": "both"},
    {
        "name": "Другое",
        "icon": "ellipsis-horizontal",
        "color": "#6B7280",
        "type": "both",
    },
]
