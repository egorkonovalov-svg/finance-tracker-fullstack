from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.config import settings
from app.database import engine, Base
from app.dependencies import get_current_user
from app.models.user import User
import app.models  # noqa: F401

router = APIRouter(prefix="/dev", tags=["Dev"])


@router.post(
    "/reset-db",
    status_code=status.HTTP_200_OK,
    summary="Reset the database (dev only)",
    description=(
        "Drops and recreates all tables. Only available when "
        "`ENVIRONMENT=local` and the `X-Dev-Admin-Key` header matches "
        "`settings.DEV_ADMIN_KEY`. Used during local development to reset "
        "test state without restarting Docker."
    ),
)
async def reset_database(
    current_user: User = Depends(get_current_user),
    x_dev_admin_key: str | None = Header(default=None),
):
    """Drop and recreate all database tables (local environment only)."""
    if settings.ENVIRONMENT != "local":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available in the local environment",
        )
    if not settings.DEV_ADMIN_KEY or x_dev_admin_key != settings.DEV_ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing dev admin key",
        )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    return {"detail": "All tables dropped and recreated"}
