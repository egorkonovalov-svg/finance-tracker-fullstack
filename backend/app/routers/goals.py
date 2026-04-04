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


@router.get(
    "",
    response_model=list[GoalResponse],
    summary="List savings goals",
    description="Returns all savings goals for the current user.",
)
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all savings goals belonging to the current user."""
    result = await db.execute(select(Goal).where(Goal.user_id == current_user.id))
    goals = result.scalars().all()
    return [GoalResponse.model_validate(g) for g in goals]


@router.post(
    "",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a savings goal",
    description="Creates a new savings goal with a target amount and optional target date.",
)
async def create_goal(
    body: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new savings goal for the current user."""
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
    return GoalResponse.model_validate(goal)


@router.put(
    "/{goal_id}",
    response_model=GoalResponse,
    summary="Update a savings goal",
    description="Partial update — only fields present in the request body are changed.",
)
async def update_goal(
    goal_id: UUID,
    body: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Partially update a savings goal."""
    goal = await get_or_404(db, Goal, goal_id, current_user.id, detail="Goal not found")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return GoalResponse.model_validate(goal)


@router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a savings goal",
    description="Permanently deletes a savings goal. Returns 204 No Content.",
)
async def delete_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a savings goal by UUID."""
    goal = await get_or_404(db, Goal, goal_id, current_user.id, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return None
