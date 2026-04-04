from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    target_amount: Decimal = Field(gt=0)
    target_date: date
    current_amount: Decimal = Field(default=Decimal(0), ge=0)

    @model_validator(mode="after")
    def validate_goal(self) -> "GoalCreate":
        if self.target_date <= date.today():
            raise ValueError("target_date must be in the future")
        if self.current_amount > self.target_amount:
            raise ValueError("current_amount cannot exceed target_amount")
        return self


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    target_amount: Decimal | None = Field(default=None, gt=0)
    target_date: date | None = None
    current_amount: Decimal | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_goal(self) -> "GoalUpdate":
        if self.target_date is not None and self.target_date <= date.today():
            raise ValueError("target_date must be in the future")
        if self.current_amount is not None and self.target_amount is not None:
            if self.current_amount > self.target_amount:
                raise ValueError("current_amount cannot exceed target_amount")
        return self


class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    target_date: date
    current_amount: float
    created_at: datetime

    model_config = {"from_attributes": True}
