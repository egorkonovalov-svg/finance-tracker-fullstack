from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, cast, extract, func, select, case, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.category import Category
from app.models.transaction import Transaction


async def _get_income_expense_totals(
    db: AsyncSession, base_filter
) -> tuple[float, float]:
    """Sum income and expense totals for transactions matching a SQLAlchemy filter.

    Args:
        db: Async database session.
        base_filter: A SQLAlchemy WHERE clause (e.g. from `and_(...)`) already
            scoped to the target user and date range.

    Returns:
        A tuple of (total_income, total_expenses) as floats, both >= 0.
        Returns (0.0, 0.0) when no transactions match.
    """
    totals_q = select(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.type == "income", Transaction.amount), else_=Decimal(0)
                )
            ),
            Decimal(0),
        ).label("total_income"),
        func.coalesce(
            func.sum(
                case(
                    (Transaction.type == "expense", Transaction.amount),
                    else_=Decimal(0),
                )
            ),
            Decimal(0),
        ).label("total_expenses"),
    ).where(base_filter)

    totals = (await db.execute(totals_q)).one()
    return float(totals.total_income), float(totals.total_expenses)


async def _get_by_category_breakdown(
    db: AsyncSession, user_id: UUID, base_filter
) -> list[dict]:
    """Return expense totals grouped by category for a given filter.

    Args:
        db: Async database session.
        user_id: The authenticated user's UUID (used to scope the category join).
        base_filter: A SQLAlchemy WHERE clause scoped to the target user/period.

    Returns:
        List of dicts ordered by amount descending, each with keys:
            - ``category`` (str | None): Category name; None if uncategorised.
            - ``amount`` (float): Total expense amount in RUB.
            - ``color`` (str): Hex color from the category row, or the app
              default color when the category has no color set.
    """
    by_cat_q = (
        select(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("amount"),
            func.coalesce(Category.color, settings.DEFAULT_CATEGORY_COLOR).label(
                "color"
            ),
        )
        .outerjoin(Category, Category.id == Transaction.category_id)
        .where(and_(base_filter, Transaction.type == "expense"))
        .group_by(Category.name, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
    )
    by_cat_rows = (await db.execute(by_cat_q)).all()
    return [
        {"category": r.category, "amount": float(r.amount), "color": r.color}
        for r in by_cat_rows
    ]


async def _get_daily_breakdown(
    db: AsyncSession, base_filter, year: int, month: int
) -> list[dict]:
    """Return a day-by-day income/expense breakdown for a calendar month.

    Fills in zeroes for days that have no transactions, stopping at today for
    the current month (so future dates are not included).

    Args:
        db: Async database session.
        base_filter: A SQLAlchemy WHERE clause scoped to the target user/period.
        year: Four-digit year of the target month.
        month: Month number 1-12.

    Returns:
        List of dicts in ascending date order from the 1st of the month up to
        (but not including) today or the last day of the month, whichever is
        earlier. Each dict has keys:
            - ``date`` (str): ISO-8601 date string, e.g. ``"2024-03-15"``.
            - ``income`` (float): Total income for that day in RUB.
            - ``expense`` (float): Total expenses for that day in RUB.
    """
    day_col = cast(Transaction.date, Date).label("day")
    daily_q = (
        select(
            day_col,
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == "income", Transaction.amount),
                        else_=Decimal(0),
                    )
                ),
                Decimal(0),
            ).label("income"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == "expense", Transaction.amount),
                        else_=Decimal(0),
                    )
                ),
                Decimal(0),
            ).label("expense"),
        )
        .where(base_filter)
        .group_by(day_col)
        .order_by(day_col)
    )
    daily_rows = (await db.execute(daily_q)).all()

    today = datetime.now(timezone.utc).date()
    last_day = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
    end_day = min(today, last_day)
    start_day = date(year, month, 1)

    daily_map: dict[str, dict] = {}
    for r in daily_rows:
        d = r.day if isinstance(r.day, date) else r.day.date()
        daily_map[d.isoformat()] = {
            "income": float(r.income),
            "expense": float(r.expense),
        }

    daily = []
    current = start_day
    while current < end_day:
        key = current.isoformat()
        entry = daily_map.get(key, {"income": 0.0, "expense": 0.0})
        daily.append({"date": key, **entry})
        current = date.fromordinal(current.toordinal() + 1)

    return daily


async def get_monthly_stats(
    db: AsyncSession, user_id: UUID, year: int, month: int
) -> dict:
    """Aggregate all statistics for a single calendar month.

    Combines income/expense totals, category breakdown, and daily breakdown
    into a single dict consumed by the ``/transactions/stats`` endpoint.

    Args:
        db: Async database session.
        user_id: The authenticated user's UUID.
        year: Four-digit year of the target month.
        month: Month number 1-12.

    Returns:
        Dict with keys:
            - ``total_income`` (float): Sum of all income transactions in RUB.
            - ``total_expenses`` (float): Sum of all expense transactions in RUB.
            - ``balance`` (float): ``total_income - total_expenses``.
            - ``by_category`` (list[dict]): See ``_get_by_category_breakdown``.
            - ``daily`` (list[dict]): See ``_get_daily_breakdown``.
    """
    base_filter = and_(
        Transaction.user_id == user_id,
        extract("year", Transaction.date) == year,
        extract("month", Transaction.date) == month,
    )

    total_income, total_expenses = await _get_income_expense_totals(db, base_filter)
    by_category = await _get_by_category_breakdown(db, user_id, base_filter)
    daily = await _get_daily_breakdown(db, base_filter, year, month)

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_income - total_expenses,
        "by_category": by_category,
        "daily": daily,
    }
