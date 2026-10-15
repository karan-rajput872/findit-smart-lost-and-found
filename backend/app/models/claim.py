"""Claim SQLAlchemy database model."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.item import Item


class ClaimStatus(str, enum.Enum):
    """Status of an ownership verification claim."""
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HandoverStatus(str, enum.Enum):
    """Status of physical item handover coordination."""
    AWAITING_HANDOVER = "awaiting_handover"
    HANDOVER_ARRANGED = "handover_arranged"
    RETURNED_SUCCESSFULLY = "returned_successfully"


class Claim(Base):
    """Private ownership verification claim submitted for a listed item."""

    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    item_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claimant_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_owner_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Claim reason/explanation and private proof of ownership
    description: Mapped[str] = mapped_column(Text, nullable=False)
    proof_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30),
        default=ClaimStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    handover_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    handover_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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
    item: Mapped["Item"] = relationship("Item", back_populates="claims")
    claimant: Mapped["User"] = relationship(
        "User",
        foreign_keys=[claimant_id],
        back_populates="claims",
    )
    item_owner: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[item_owner_id],
        back_populates="received_claims",
    )

    def __repr__(self) -> str:
        return f"<Claim(id='{self.id}', item_id='{self.item_id}', claimant_id='{self.claimant_id}', status='{self.status}')>"
