from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.exceptions import ConflictError
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.utils import get_or_404
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "",
    response_model=list[CategoryResponse],
    summary="List categories",
    description="Returns all transaction categories owned by the current user.",
)
async def list_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all categories belonging to the current user."""
    result = await db.execute(
        select(Category).where(Category.user_id == current_user.id)
    )
    categories = result.scalars().all()
    return [CategoryResponse.model_validate(c) for c in categories]


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a category",
    description="Creates a new transaction category for the current user.",
)
async def create_category(
    body: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new category for the current user."""
    category = Category(user_id=current_user.id, **body.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Update a category",
    description="Updates any fields on the category (name, color, icon, etc.).",
)
async def update_category(
    category_id: UUID,
    body: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a category's fields."""
    category = await get_or_404(
        db, Category, category_id, current_user.id, detail="Category not found"
    )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category",
    description="Deletes a category. Raises 409 if any transactions still reference it.",
)
async def delete_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a category, blocking if transactions still reference it."""
    category = await get_or_404(
        db, Category, category_id, current_user.id, detail="Category not found"
    )

    count = (
        await db.execute(
            select(func.count(Transaction.id)).where(
                Transaction.category_id == category_id
            )
        )
    ).scalar() or 0
    if count > 0:
        raise ConflictError(
            f"Cannot delete category: {count} transaction(s) still reference it"
        )

    await db.delete(category)
    await db.commit()
    return None
