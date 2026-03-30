from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_or_404(db: AsyncSession, model, id: UUID, user_id: UUID, detail: str = "Not found"):
    result = await db.execute(
        select(model).where(model.id == id, model.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return obj
