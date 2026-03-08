from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    target_amount: Decimal = Field(gt=0)
    target_date: date
    current_amount: Decimal = Field(default=Decimal(0), ge=0)


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    target_amount: Decimal | None = Field(default=None, gt=0)
    target_date: date | None = None
    current_amount: Decimal | None = Field(default=None, ge=0)


class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    target_date: date
    current_amount: float
    created_at: datetime

    model_config = {"from_attributes": True}
