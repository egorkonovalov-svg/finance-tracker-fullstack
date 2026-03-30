from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.goal import Goal
from app.models.user import User
from app.utils import get_or_404
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate

router = APIRouter(prefix="/goals", tags=["Goals"])


def _to_response(g: Goal) -> GoalResponse:
    return GoalResponse(
        id=str(g.id),
        name=g.name,
        target_amount=float(g.target_amount),
        target_date=g.target_date,
        current_amount=float(g.current_amount),
        created_at=g.created_at,
    )


@router.get("", response_model=list[GoalResponse])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Goal).where(Goal.user_id == current_user.id))
    goals = result.scalars().all()
    return [_to_response(g) for g in goals]


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    body: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = Goal(
        user_id=current_user.id,
        name=body.name,
        target_amount=body.target_amount,
        target_date=body.target_date,
        current_amount=body.current_amount,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return _to_response(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID,
    body: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await get_or_404(db, Goal, goal_id, current_user.id, detail="Goal not found")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return _to_response(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await get_or_404(db, Goal, goal_id, current_user.id, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return None
