"""User SQLAlchemy database model."""

from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.schemas.user import UserResponse

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.claim import Claim
    from app.models.notification import Notification


class User(Base):
    """Registered campus community participant."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_sub: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(30), default="local", nullable=False)
    campus: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), default="student", nullable=False)  # student, staff, admin
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Contact Information & Privacy Preferences
    phone_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    whatsapp_same_as_phone: Mapped[bool] = mapped_column(default=True, nullable=False)
    preferred_contact_method: Mapped[str] = mapped_column(String(30), default="findit_chat", nullable=False)  # findit_chat, whatsapp, phone_call

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
    items: Mapped[List["Item"]] = relationship(
        "Item",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    claims: Mapped[List["Claim"]] = relationship(
        "Claim",
        foreign_keys="[Claim.claimant_id]",
        back_populates="claimant",
        cascade="all, delete-orphan",
    )
    received_claims: Mapped[List["Claim"]] = relationship(
        "Claim",
        foreign_keys="[Claim.item_owner_id]",
        back_populates="item_owner",
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def to_response(self) -> UserResponse:
        """Convert model to safe UserResponse schema excluding password hash."""
        created_iso = (
            self.created_at.isoformat()
            if hasattr(self.created_at, "isoformat")
            else str(self.created_at)
        )
        if not created_iso.endswith("Z") and "+" not in created_iso:
            created_iso += "Z"

        return UserResponse(
            id=self.id,
            email=self.email,
            fullName=self.full_name,
            campus=self.campus,
            role=self.role,  # type: ignore[arg-type]
            avatarUrl=self.avatar_url,
            phoneNumber=self.phone_number,
            whatsappNumber=self.whatsapp_number,
            whatsappSameAsPhone=bool(self.whatsapp_same_as_phone),
            preferredContactMethod=self.preferred_contact_method or "findit_chat",
            authProvider=self.auth_provider or "local",
            createdAt=created_iso,
        )

    def __repr__(self) -> str:
        return f"<User(id='{self.id}', email='{self.email}', campus='{self.campus}')>"
