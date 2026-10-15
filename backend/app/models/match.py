"""ItemMatch SQLAlchemy database model for AI recommendation pairings."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import (
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.item import Item


class MatchStatus(str, enum.Enum):
    """Status lifecycle of a suggested match."""
    SUGGESTED = "suggested"
    VIEWED = "viewed"
    DISMISSED = "dismissed"
    CLAIMED = "claimed"


class MatchFeedback(str, enum.Enum):
    """User feedback on AI match recommendation."""
    RELEVANT = "relevant"
    NOT_RELEVANT = "not_relevant"
    ALREADY_RECOVERED = "already_recovered"
    DUPLICATE = "duplicate"


class ItemMatch(Base):
    """AI-calculated potential match pairing between a lost item and a found item."""

    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("lost_item_id", "found_item_id", name="uq_lost_found_match"),
    )

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)

    lost_item_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    found_item_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lost_user_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    found_user_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Match Scores (0 - 100)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    confidence_tier: Mapped[str] = mapped_column(String(20), nullable=False, default="possible", index=True)
    title_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    semantic_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    attribute_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    location_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    date_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_score: Mapped[int] = mapped_column(Integer, nullable=False, default=50)

    # Explanations and Rationale
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reasons_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")

    # Workflow & Feedback
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=MatchStatus.SUGGESTED.value,
        index=True,
    )
    feedback: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        index=True,
    )
    feedback_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
    )

    # Relationships
    lost_item: Mapped["Item"] = relationship(
        "Item",
        foreign_keys=[lost_item_id],
        lazy="joined",
    )
    found_item: Mapped["Item"] = relationship(
        "Item",
        foreign_keys=[found_item_id],
        lazy="joined",
    )
    lost_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[lost_user_id],
        lazy="selectin",
    )
    found_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[found_user_id],
        lazy="selectin",
    )
