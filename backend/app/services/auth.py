import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import httpx
from jose import jwt, jwk, JWTError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.constants import DEFAULT_CATEGORIES
from app.database import async_session
from app.exceptions import AuthenticationError, ConflictError, RateLimitError
from app.models.category import Category
from app.models.user import User
from app.models.verification_code import VerificationCode

logger = logging.getLogger(__name__)


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


async def cleanup_expired_revoked_tokens() -> None:
    from app.models.revoked_token import RevokedToken

    async with async_session() as db:
        await db.execute(
            delete(RevokedToken).where(
                RevokedToken.expires_at < datetime.now(timezone.utc)
            )
        )
        await db.commit()


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

_apple_keys_cache: dict | None = None
_apple_keys_fetched_at: float = 0


async def _fetch_apple_public_keys() -> dict:
    global _apple_keys_cache, _apple_keys_fetched_at

    now = time.monotonic()
    if _apple_keys_cache and (now - _apple_keys_fetched_at) < settings.APPLE_KEYS_TTL:
        return _apple_keys_cache

    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.APPLE_KEYS_URL, timeout=10)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AuthenticationError(
                f"Failed to fetch Apple public keys: {exc.response.status_code}"
            ) from exc

    _apple_keys_cache = resp.json()
    _apple_keys_fetched_at = now
    return _apple_keys_cache


def _find_matching_key(keys_data: dict, kid: str) -> dict:
    """Find the Apple public key matching the given key ID."""
    for key_data in keys_data.get("keys", []):
        if key_data.get("kid") == kid:
            return key_data
    raise AuthenticationError("Apple ID token signed with unknown key")


def _validate_apple_jwt(id_token: str, public_key) -> dict:
    """Decode and validate an Apple JWT against the given public key."""
    try:
        return jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.APPLE_CLIENT_ID,
            issuer="https://appleid.apple.com",
            options={"verify_aud": True},
        )
    except JWTError as e:
        logger.warning("Apple ID token verification failed: %s", e)
        raise AuthenticationError("Invalid Apple ID token") from e


async def verify_apple_id_token(id_token: str) -> dict:
    """Verify an Apple ID token by checking its signature against Apple's public keys."""
    if not settings.APPLE_CLIENT_ID:
        raise AuthenticationError("Apple auth not configured")

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except JWTError as e:
        raise AuthenticationError("Invalid Apple ID token") from e

    kid = unverified_header.get("kid")
    if not kid:
        raise AuthenticationError("Apple ID token missing key ID")

    keys_data = await _fetch_apple_public_keys()
    matching_key = _find_matching_key(keys_data, kid)
    public_key = jwk.construct(matching_key)
    return _validate_apple_jwt(id_token, public_key)


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
        raise AuthenticationError("Invalid or expired verification session")

    if record.expires_at < datetime.now(timezone.utc):
        raise AuthenticationError("Verification code expired")

    if record.attempts >= settings.MAX_VERIFICATION_ATTEMPTS:
        raise RateLimitError("Too many failed attempts. Please request a new code.")

    if record.code != code:
        record.attempts += 1
        await db.commit()
        remaining = settings.MAX_VERIFICATION_ATTEMPTS - record.attempts
        raise AuthenticationError(f"Invalid code. {remaining} attempt(s) remaining.")

    record.used = True
    await db.commit()
    return record


# ─── User provisioning ──────────────────────────────────────────────────────


async def seed_categories(db: AsyncSession, user_id) -> None:
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user_id, **cat))


async def get_or_create_user(
    db: AsyncSession, email: str, password: str, name: str | None
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()

    if existing and existing.is_verified:
        raise ConflictError("Email already registered")

    if existing and not existing.is_verified:
        existing.password_hash = hash_password(password)
        existing.name = name
        await db.flush()
        return existing

    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        is_verified=False,
    )
    db.add(user)
    await db.flush()
    return user


async def get_or_create_social_user(
    db: AsyncSession, email: str, name: str | None, provider: str
) -> tuple[User, bool]:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, name=name, provider=provider, is_verified=True)
        db.add(user)
        await db.flush()
        await seed_categories(db, user.id)
        await db.commit()
        await db.refresh(user)
        return user, True

    if not user.is_verified:
        user.is_verified = True
    await db.commit()
    return user, False


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
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AuthenticationError(
                f"Failed to fetch Google public keys: {exc.response.status_code}"
            ) from exc

    _google_keys_cache = resp.json()
    _google_keys_fetched_at = now
    return _google_keys_cache


async def verify_google_id_token(id_token: str) -> dict:
    if not settings.GOOGLE_CLIENT_ID:
        raise AuthenticationError("Google auth not configured")

    try:
        unverified_header = jwt.get_unverified_header(id_token)
    except JWTError as e:
        raise AuthenticationError("Invalid Google ID token") from e

    kid = unverified_header.get("kid")
    if not kid:
        raise AuthenticationError("Google ID token missing key ID")

    keys_data = await _fetch_google_public_keys()
    matching_key = None
    for key_data in keys_data.get("keys", []):
        if key_data.get("kid") == kid:
            matching_key = key_data
            break

    if not matching_key:
        raise AuthenticationError("Google ID token signed with unknown key")

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
        raise AuthenticationError("Invalid Google ID token") from e

    return payload
