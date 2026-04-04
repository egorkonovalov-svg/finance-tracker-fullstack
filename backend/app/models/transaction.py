import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, Boolean, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transaction"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("category.id"), nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="transactions")  # noqa: F821
    category_rel: Mapped["Category"] = relationship(back_populates="transactions")  # noqa: F821

    @property
    def category(self) -> str:
        return self.category_rel.name if self.category_rel else ""
