import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.exceptions import AuthenticationError, AuthorizationError, EmailDeliveryError
from app.models.user import User
from app.models.verification_code import VerificationCode
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    ResendCodeRequest,
    SignupRequest,
    SocialAuthRequest,
    UserResponse,
    VerificationPendingResponse,
    VerifyCodeRequest,
)
from app.config import (
    RATE_LIMIT_AUTH_DEFAULT,
    RATE_LIMIT_RESEND,
    RATE_LIMIT_VERIFY,
    settings,
)
from app.services.auth import (
    add_token_to_blocklist,
    create_access_token,
    create_verification,
    get_or_create_social_user,
    get_or_create_user,
    seed_categories,
    validate_verification_code,
    verify_apple_id_token,
    verify_google_id_token,
    verify_password,
)
from app.services.email import send_verification_email

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _build_auth_response(user: User, token: str) -> AuthResponse:
    """Build the standard AuthResponse from a User ORM object and a JWT string.

    Args:
        user: The authenticated User ORM instance.
        token: A signed JWT access token string.

    Returns:
        ``AuthResponse`` containing a ``UserResponse`` sub-object and the token.
    """
    return AuthResponse(
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            avatar=user.avatar,
        ),
        access_token=token,
    )


@router.post(
    "/signup",
    response_model=VerificationPendingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
    description=(
        "Creates a new user (or refreshes an unverified one) and sends a "
        "6-digit verification code to the supplied email address. "
        "Returns a `session_id` to be passed to `/auth/verify-code`."
    ),
)
@limiter.limit(RATE_LIMIT_AUTH_DEFAULT)
async def signup(
    request: Request, body: SignupRequest, db: AsyncSession = Depends(get_db)
):
    """Register a new account and initiate email verification."""
    user = await get_or_create_user(db, body.email, body.password, body.name)

    session_id, code = await create_verification(db, user.id, "signup")
    try:
        await send_verification_email(user.email, code)
    except EmailDeliveryError as exc:
        logger.warning("Verification email not delivered: %s", exc)

    return VerificationPendingResponse(
        session_id=session_id,
        message="Verification code sent to your email",
    )


@router.post(
    "/login",
    response_model=VerificationPendingResponse,
    summary="Log in with email and password",
    description=(
        "Validates credentials and sends a 6-digit code to the user's email. "
        "Returns a `session_id` to pass to `/auth/verify-code`. "
        "Raises 401 for invalid credentials, 403 if the email is unverified."
    ),
)
@limiter.limit(RATE_LIMIT_AUTH_DEFAULT)
async def login(
    request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)
):
    """Validate credentials and send a login verification code."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise AuthenticationError("Invalid credentials")

    if not user.is_verified:
        raise AuthorizationError("Email not verified. Please sign up again.")

    if not verify_password(body.password, user.password_hash):
        raise AuthenticationError("Invalid credentials")

    session_id, code = await create_verification(db, user.id, "login")
    try:
        await send_verification_email(user.email, code)
    except EmailDeliveryError as exc:
        logger.warning("Verification email not delivered: %s", exc)

    return VerificationPendingResponse(
        session_id=session_id,
        message="Verification code sent to your email",
    )


@router.post(
    "/verify-code",
    response_model=AuthResponse,
    summary="Exchange a verification code for a JWT",
    description=(
        "Validates the 6-digit code against the `session_id` returned by "
        "`/signup` or `/login`. On success returns a JWT access token. "
        "Marks the user as verified on first signup. "
        "Raises 401 on wrong code, 429 after too many failed attempts."
    ),
)
@limiter.limit(RATE_LIMIT_VERIFY)
async def verify_code(
    request: Request, body: VerifyCodeRequest, db: AsyncSession = Depends(get_db)
):
    """Validate a verification code and return a JWT access token."""
    record = await validate_verification_code(db, body.session_id, body.code)

    result = await db.execute(select(User).where(User.id == record.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if record.purpose == "signup" and not user.is_verified:
        user.is_verified = True
        await seed_categories(db, user.id)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(str(user.id))
    return _build_auth_response(user, token)


@router.post(
    "/resend-code",
    response_model=VerificationPendingResponse,
    summary="Resend a verification code",
    description=(
        "Invalidates the current session's code and issues a new one. "
        "Limited to `settings.MAX_CODE_RESENDS` resends per original session. "
        "Returns a new `session_id`."
    ),
)
@limiter.limit(RATE_LIMIT_RESEND)
async def resend_code(
    request: Request, body: ResendCodeRequest, db: AsyncSession = Depends(get_db)
):
    """Invalidate the current verification session and send a fresh code."""
    result = await db.execute(
        select(VerificationCode).where(VerificationCode.id == UUID(body.session_id))
    )
    old_record = result.scalar_one_or_none()
    if not old_record or old_record.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification session",
        )

    # Count resends: how many codes exist for this user+purpose created after the original
    resend_count_result = await db.execute(
        select(VerificationCode).where(
            VerificationCode.user_id == old_record.user_id,
            VerificationCode.purpose == old_record.purpose,
            VerificationCode.created_at >= old_record.created_at,
        )
    )
    resend_count = len(resend_count_result.scalars().all())
    if resend_count > settings.MAX_CODE_RESENDS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum resend limit reached. Please start over.",
        )

    old_record.used = True
    await db.flush()

    user_result = await db.execute(select(User).where(User.id == old_record.user_id))
    user = user_result.scalar_one()

    session_id, code = await create_verification(db, user.id, old_record.purpose)
    try:
        await send_verification_email(user.email, code)
    except EmailDeliveryError as exc:
        logger.warning("Verification email not delivered: %s", exc)

    return VerificationPendingResponse(
        session_id=session_id,
        message="New verification code sent to your email",
    )


@router.post(
    "/social",
    response_model=AuthResponse,
    summary="Sign in with Google or Apple",
    description=(
        "Verifies a provider ID token (Google or Apple), then fetches or "
        "creates the user account. New accounts have default categories seeded. "
        "Returns a JWT on success."
    ),
)
@limiter.limit(RATE_LIMIT_AUTH_DEFAULT)
async def social_auth(
    request: Request, body: SocialAuthRequest, db: AsyncSession = Depends(get_db)
):
    """Authenticate via Google or Apple and return a JWT access token."""
    if body.provider == "google":
        info = await verify_google_id_token(body.id_token)
    elif body.provider == "apple":
        info = await verify_apple_id_token(body.id_token)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {body.provider}",
        )

    email = info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not extract email from token",
        )

    user, _ = await get_or_create_social_user(
        db, email, info.get("name"), body.provider
    )
    token = create_access_token(str(user.id))
    return _build_auth_response(user, token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current user's profile",
    description="Returns the authenticated user's id, email, name, and avatar.",
)
async def me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        avatar=current_user.avatar,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Invalidate the current JWT",
    description=(
        "Adds the current token's `jti` to the revocation list so it cannot "
        "be reused. Responds 204 No Content regardless of whether the token "
        "was already revoked."
    ),
)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log out by revoking the current JWT."""
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if token:
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                await add_token_to_blocklist(db, jti, current_user.id, expires_at)
        except JWTError:
            pass
    return None
