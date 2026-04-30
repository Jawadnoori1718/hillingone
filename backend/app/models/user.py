"""User model: residents, staff, and councillors."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    ward: Mapped[str | None] = mapped_column(String(100), nullable=True)
    flexibility_credits: Mapped[int] = mapped_column(Integer, default=0)
    priority_tier: Mapped[str] = mapped_column(String(30), nullable=False, default="resident")
    accessibility_needs: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "ward": self.ward,
            "flexibility_credits": self.flexibility_credits,
            "priority_tier": self.priority_tier,
            "accessibility_needs": self.accessibility_needs,
            "is_demo": self.is_demo,
        }
