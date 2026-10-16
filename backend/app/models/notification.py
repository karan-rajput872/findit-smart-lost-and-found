"""Notification SQLAlchemy database model."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.item import Item
    from app.models.claim import Claim


class NotificationType(str, enum.Enum):
    """Event classification triggering the notification."""
    CLAIM_SUBMITTED = "claim_submitted"
    CLAIM_APPROVED = "claim_approved"
    CLAIM_REJECTED = "claim_rejected"
    CLAIM_CANCELLED = "claim_cancelled"
    CLAIM_UNDER_REVIEW = "claim_under_review"
    HANDOVER_ARRANGED = "handover_arranged"
    RETURN_IN_PROGRESS = "return_in_progress"
    ITEM_RETURNED = "item_returned"
    MATCH_FOUND = "match_found"
    NEW_MESSAGE = "new_message"
    CONTACT_SHARED = "contact_shared"
    SYSTEM = "system"


class Notification(Base):
    """User alert and system notification."""

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(30),
        default=NotificationType.SYSTEM.value,
        nullable=False,
    )
    item_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        ForeignKey("items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    claim_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        ForeignKey("claims.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
    item: Mapped[Optional["Item"]] = relationship("Item")
    claim: Mapped[Optional["Claim"]] = relationship("Claim")

    def __repr__(self) -> str:
        return f"<Notification(id='{self.id}', user_id='{self.user_id}', type='{self.notification_type}', read={self.is_read})>"
