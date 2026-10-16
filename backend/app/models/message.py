"""Message SQLAlchemy database model for secure return coordination."""

from datetime import datetime
from typing import TYPE_CHECKING
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
    from app.models.claim import Claim


class Message(Base):
    """Secure direct communication message between finder and claimant on an approved claim."""

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    claim_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationships
    claim: Mapped["Claim"] = relationship("Claim", back_populates="messages")
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id])

    def __repr__(self) -> str:
        return f"<Message(id='{self.id}', claim_id='{self.claim_id}', sender_id='{self.sender_id}', read={self.is_read})>"
