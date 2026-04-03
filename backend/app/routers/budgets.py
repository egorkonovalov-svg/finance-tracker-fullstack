from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from app.exceptions import ConflictError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.budget import Budget
from app.models.user import User
from app.utils import get_or_404
from app.schemas.budget import (
    BudgetCreate,
    BudgetResponse,
    BudgetSummaryItem,
    BudgetSummaryResponse,
    BudgetUpdate,
)
from app.services.stats import get_monthly_stats

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get(
    "",
    response_model=list[BudgetResponse],
    summary="List budgets",
    description="Returns all spending budgets for the current user.",
)
async def list_budgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all budgets belonging to the current user."""
    result = await db.execute(select(Budget).where(Budget.user_id == current_user.id))
    budgets = result.scalars().all()
    return [BudgetResponse.model_validate(b) for b in budgets]


@router.get(
    "/summary",
    response_model=BudgetSummaryResponse,
    summary="Get budget vs. actual spending summary",
    description=(
        "For each budget, computes the amount spent in the given month and the "
        "percentage of the limit used. Defaults to the current month."
    ),
)
async def budget_summary(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compare each budget limit against actual spending for a given month."""
    if month:
        year, m = int(month[:4]), int(month[5:])
    else:
        now = datetime.now(timezone.utc)
        year, m = now.year, now.month

    stats = await get_monthly_stats(db, current_user.id, year, m)
    by_cat = {item["category"]: item["amount"] for item in stats["by_category"]}

    result = await db.execute(select(Budget).where(Budget.user_id == current_user.id))
    budgets = result.scalars().all()

    items = []
    for b in budgets:
        amount_spent = by_cat.get(b.category, 0.0)
        limit = float(b.amount_limit)
        percent_used = (amount_spent / limit * 100) if limit > 0 else 0.0
        items.append(
            BudgetSummaryItem(
                category=b.category,
                amount_limit=limit,
                amount_spent=amount_spent,
                percent_used=round(percent_used, 1),
            )
        )
    return BudgetSummaryResponse(items=items)


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a budget",
    description=(
        "Creates a spending budget for a category. Raises 409 if a budget for "
        "that category already exists."
    ),
)
async def create_budget(
    body: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new category budget for the current user."""
    result = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.category == body.category,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ConflictError(f"Budget for category '{body.category}' already exists")
    budget = Budget(
        user_id=current_user.id,
        category=body.category,
        amount_limit=body.amount_limit,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return BudgetResponse.model_validate(budget)


@router.put(
    "/{budget_id}",
    response_model=BudgetResponse,
    summary="Update a budget",
    description=(
        "Updates budget fields. Raises 409 if changing the category would "
        "create a duplicate."
    ),
)
async def update_budget(
    budget_id: UUID,
    body: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing budget."""
    budget = await get_or_404(
        db, Budget, budget_id, current_user.id, detail="Budget not found"
    )
    update_data = body.model_dump(exclude_unset=True)
    new_category = update_data.get("category")
    if new_category and new_category != budget.category:
        dup = await db.execute(
            select(Budget).where(
                Budget.user_id == current_user.id,
                Budget.category == new_category,
            )
        )
        if dup.scalar_one_or_none():
            raise ConflictError(f"Budget for category '{new_category}' already exists")
    for field, value in update_data.items():
        setattr(budget, field, value)
    await db.commit()
    await db.refresh(budget)
    return BudgetResponse.model_validate(budget)


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a budget",
    description="Permanently deletes a budget. Returns 204 No Content.",
)
async def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a budget by UUID."""
    budget = await get_or_404(
        db, Budget, budget_id, current_user.id, detail="Budget not found"
    )
    await db.delete(budget)
    await db.commit()
    return None
