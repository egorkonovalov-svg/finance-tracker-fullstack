from decimal import Decimal

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    amount_limit: Decimal = Field(gt=0)


class BudgetUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=100)
    amount_limit: Decimal | None = Field(default=None, gt=0)


class BudgetResponse(BaseModel):
    id: str
    category: str
    amount_limit: float

    model_config = {"from_attributes": True}


class BudgetSummaryItem(BaseModel):
    category: str
    amount_limit: float
    amount_spent: float
    percent_used: float


class BudgetSummaryResponse(BaseModel):
    items: list[BudgetSummaryItem]
