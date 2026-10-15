"""Item SQLAlchemy database model."""

import enum
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.schemas.item import ItemResponse

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.claim import Claim


class ReportType(str, enum.Enum):
    """Classification of the item report."""
    LOST = "lost"
    FOUND = "found"


class ItemStatus(str, enum.Enum):
    """Lifecycle status of the reported item."""
    OPEN = "open"
    PENDING_VERIFICATION = "pending_verification"
    CLAIMED = "claimed"
    RESOLVED = "resolved"


class Item(Base):
    """Campus lost or found item listing."""

    __tablename__ = "items"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # lost, found
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    campus: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30),
        default="open",
        nullable=False,
        index=True,
    )
    reporter_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reporter_contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    owner: Mapped[Optional["User"]] = relationship("User", back_populates="items")
    claims: Mapped[List["Claim"]] = relationship(
        "Claim",
        back_populates="item",
        cascade="all, delete-orphan",
    )

    def to_response(self) -> ItemResponse:
        """Convert model instance to client-aligned ItemResponse schema."""
        created_iso = (
            self.created_at.isoformat()
            if hasattr(self.created_at, "isoformat")
            else str(self.created_at)
        )
        if not created_iso.endswith("Z") and "+" not in created_iso:
            created_iso += "Z"

        updated_iso = None
        if self.updated_at:
            updated_iso = (
                self.updated_at.isoformat()
                if hasattr(self.updated_at, "isoformat")
                else str(self.updated_at)
            )
            if not updated_iso.endswith("Z") and "+" not in updated_iso:
                updated_iso += "Z"

        return ItemResponse(
            id=self.id,
            userId=self.user_id,
            title=self.title,
            description=self.description,
            category=self.category,
            type=self.type,  # type: ignore[arg-type]
            location=self.location,
            campus=self.campus,
            date=self.date,
            imageUrl=self.image_url,
            reporterName=self.reporter_name,
            reporterContact=self.reporter_contact,
            status=self.status,  # type: ignore[arg-type]
            isDemo=self.is_demo,
            createdAt=created_iso,
            updatedAt=updated_iso,
        )

    def __repr__(self) -> str:
        return f"<Item(id='{self.id}', title='{self.title}', type='{self.type}', status='{self.status}')>"
