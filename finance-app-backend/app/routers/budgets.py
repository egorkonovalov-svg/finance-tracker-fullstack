from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.budget import Budget
from app.models.user import User
from app.schemas.budget import (
    BudgetCreate,
    BudgetResponse,
    BudgetSummaryItem,
    BudgetSummaryResponse,
    BudgetUpdate,
)
from app.services.stats import get_monthly_stats

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def _to_response(b: Budget) -> BudgetResponse:
    return BudgetResponse(
        id=str(b.id),
        category=b.category,
        amount_limit=float(b.amount_limit),
    )


@router.get("", response_model=list[BudgetResponse])
async def list_budgets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(Budget.user_id == current_user.id)
    )
    budgets = result.scalars().all()
    return [_to_response(b) for b in budgets]


@router.get("/summary", response_model=BudgetSummaryResponse)
async def budget_summary(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if month:
        year, m = int(month[:4]), int(month[5:])
    else:
        now = datetime.now(timezone.utc)
        year, m = now.year, now.month

    stats = await get_monthly_stats(db, current_user.id, year, m)
    by_cat = {item["category"]: item["amount"] for item in stats["by_category"]}

    result = await db.execute(
        select(Budget).where(Budget.user_id == current_user.id)
    )
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


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.category == body.category,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget for category '{body.category}' already exists",
        )
    budget = Budget(
        user_id=current_user.id,
        category=body.category,
        amount_limit=body.amount_limit,
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return _to_response(budget)


@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: UUID,
    body: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Budget for category '{new_category}' already exists",
            )
    for field, value in update_data.items():
        setattr(budget, field, value)
    await db.commit()
    await db.refresh(budget)
    return _to_response(budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Budget).where(
            Budget.id == budget_id,
            Budget.user_id == current_user.id,
        )
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )
    await db.delete(budget)
    await db.commit()
    return None
