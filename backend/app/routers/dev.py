from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.database import engine, Base
from app.dependencies import get_current_user
from app.models.user import User
import app.models  # noqa: F401

router = APIRouter(prefix="/dev", tags=["Dev"])


@router.post("/reset-db", status_code=status.HTTP_200_OK)
async def reset_database(current_user: User = Depends(get_current_user)):
    """Drop all tables and recreate them. Destroys all data. Local environment only."""
    if settings.ENVIRONMENT != "local":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available in the local environment",
        )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    return {"detail": "All tables dropped and recreated"}
