from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import Select, func, select, exists
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.exceptions import NotFoundError
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.utils import get_or_404
from app.schemas.transaction import (
    StatsResponse,
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.stats import get_monthly_stats

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def _apply_filters(
    q: Select,
    user_id: UUID,
    *,
    type: str | None,
    category_id: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
    amount_min: float | None,
    amount_max: float | None,
    search: str | None,
) -> Select:
    q = q.where(Transaction.user_id == user_id)
    if type:
        q = q.where(Transaction.type == type)
    if category_id:
        q = q.where(Transaction.category_id == category_id)
    if date_from:
        q = q.where(Transaction.date >= date_from)
    if date_to:
        q = q.where(Transaction.date <= date_to)
    if amount_min is not None:
        q = q.where(Transaction.amount >= amount_min)
    if amount_max is not None:
        q = q.where(Transaction.amount <= amount_max)
    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        q = q.where(
            Transaction.note.ilike(pattern, escape="\\")
            | exists(
                select(Category.id).where(
                    Category.id == Transaction.category_id,
                    Category.name.ilike(pattern, escape="\\"),
                )
            )
        )
    return q


async def _validate_category(db: AsyncSession, category_id: str, user_id: UUID) -> None:
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise NotFoundError("Category not found")


@router.get("/stats", response_model=StatsResponse)
async def stats(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if month:
        year, m = int(month[:4]), int(month[5:])
    else:
        now = datetime.now(timezone.utc)
        year, m = now.year, now.month

    data = await get_monthly_stats(db, current_user.id, year, m)
    return StatsResponse(**data)


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    type: str | None = None,
    category_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    amount_min: float | None = None,
    amount_max: float | None = None,
    search: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1, le=10000),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filter_kwargs = dict(
        type=type,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
        amount_min=amount_min,
        amount_max=amount_max,
        search=search,
    )

    count_q = _apply_filters(
        select(func.count(Transaction.id)), current_user.id, **filter_kwargs
    )
    total = (await db.execute(count_q)).scalar() or 0

    items_q = _apply_filters(select(Transaction), current_user.id, **filter_kwargs)
    items_q = (
        items_q.options(selectinload(Transaction.category_rel))
        .order_by(Transaction.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(items_q)
    items = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionResponse.model_validate(tx) for tx in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category_rel))
        .where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise NotFoundError("Transaction not found")
    return TransactionResponse.model_validate(tx)


@router.post(
    "", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    body: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _validate_category(db, body.category_id, current_user.id)
    tx = Transaction(user_id=current_user.id, **body.model_dump())
    db.add(tx)
    await db.commit()
    await db.refresh(tx, attribute_names=["category_rel"])
    return TransactionResponse.model_validate(tx)


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    body: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx = await get_or_404(
        db, Transaction, transaction_id, current_user.id, detail="Transaction not found"
    )

    update_data = body.model_dump(exclude_unset=True)
    if "category_id" in update_data:
        await _validate_category(db, update_data["category_id"], current_user.id)
    for field, value in update_data.items():
        setattr(tx, field, value)

    await db.commit()
    await db.refresh(tx, attribute_names=["category_rel"])
    return TransactionResponse.model_validate(tx)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx = await get_or_404(
        db, Transaction, transaction_id, current_user.id, detail="Transaction not found"
    )

    await db.delete(tx)
    await db.commit()
    return None
