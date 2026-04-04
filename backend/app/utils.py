from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundError


async def get_or_404(
    db: AsyncSession, model, id: UUID, user_id: UUID, detail: str = "Not found"
):
    result = await db.execute(
        select(model).where(model.id == id, model.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise NotFoundError(detail)
    return obj
