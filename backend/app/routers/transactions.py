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
    """Apply optional filters to a transaction SQLAlchemy query.

    All filter arguments are optional; only non-None values are applied. The
    ``search`` filter matches against the transaction's ``note`` field and the
    linked category name (case-insensitive, SQL LIKE with escape for ``%``/``_``).

    Args:
        q: Base ``Select`` query to extend.
        user_id: Scope results to this user.
        type: ``"income"`` or ``"expense"``, or ``None`` to include both.
        category_id: UUID string of the category, or ``None``.
        date_from: Lower bound (inclusive) on ``Transaction.date``.
        date_to: Upper bound (inclusive) on ``Transaction.date``.
        amount_min: Minimum amount in RUB (inclusive).
        amount_max: Maximum amount in RUB (inclusive).
        search: Substring to match against note or category name.

    Returns:
        The extended ``Select`` object with all applicable WHERE clauses added.
    """
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
    """Verify that a category exists and belongs to the given user.

    Args:
        db: Async database session.
        category_id: UUID string of the category to validate.
        user_id: UUID of the authenticated user.

    Raises:
        NotFoundError: If no category with the given id and user_id is found.
    """
    try:
        cat_uuid = UUID(category_id)
    except ValueError:
        raise NotFoundError("Category not found")
    result = await db.execute(
        select(Category).where(
            Category.id == cat_uuid,
            Category.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise NotFoundError("Category not found")


@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="Get monthly statistics",
    description=(
        "Returns aggregated stats for a calendar month: total income, total "
        "expenses, balance, per-category expense breakdown, and a daily "
        "income/expense timeline. Defaults to the current month."
    ),
)
async def stats(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return income/expense/balance statistics for a given month (YYYY-MM)."""
    if month:
        year, m = int(month[:4]), int(month[5:])
    else:
        now = datetime.now(timezone.utc)
        year, m = now.year, now.month

    data = await get_monthly_stats(db, current_user.id, year, m)
    return StatsResponse(**data)


@router.get(
    "",
    response_model=TransactionListResponse,
    summary="List transactions",
    description=(
        "Returns a paginated, filterable list of the user's transactions. "
        "Supports filtering by type, category, date range, amount range, and "
        "free-text search across note and category name."
    ),
)
async def list_transactions(
    type: str | None = None,
    category_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    amount_min: float | None = None,
    amount_max: float | None = None,
    search: str | None = Query(default=None, max_length=200),  # increased from 100 to support longer category+note combos
    page: int = Query(default=1, ge=1, le=10000),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's transactions with optional filters and pagination."""
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


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Get a single transaction",
    description="Returns a transaction by ID. Raises 404 if not found or not owned by the user.",
)
async def get_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a transaction by UUID."""
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
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a transaction",
    description=(
        "Creates a new income or expense transaction. The `category_id` must "
        "belong to the authenticated user. Amounts are stored in RUB."
    ),
)
async def create_transaction(
    body: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new transaction for the current user."""
    await _validate_category(db, body.category_id, current_user.id)
    tx = Transaction(user_id=current_user.id, **body.model_dump())
    db.add(tx)
    await db.commit()
    await db.refresh(tx, attribute_names=["category_rel"])
    return TransactionResponse.model_validate(tx)


@router.put(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Update a transaction",
    description=(
        "Partial update — only fields present in the request body are changed. "
        "If `category_id` is updated it is validated against the user's categories."
    ),
)
async def update_transaction(
    transaction_id: UUID,
    body: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Partially update a transaction."""
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


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a transaction",
    description="Permanently deletes a transaction. Returns 204 No Content on success.",
)
async def delete_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a transaction by UUID."""
    tx = await get_or_404(
        db, Transaction, transaction_id, current_user.id, detail="Transaction not found"
    )

    await db.delete(tx)
    await db.commit()
    return None
