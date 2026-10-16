"""Pydantic schemas for Notification entities."""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict, AliasChoices

NotificationCategoryType = Literal[
    "claim_submitted",
    "claim_approved",
    "claim_rejected",
    "claim_cancelled",
    "claim_under_review",
    "handover_arranged",
    "return_in_progress",
    "item_returned",
    "match_found",
    "new_message",
    "contact_shared",
    "system",
]


class NotificationResponse(BaseModel):
    """Notification alert representation for the authenticated user."""

    id: str = Field(..., description="Unique notification identifier")
    userId: str = Field(
        ...,
        validation_alias=AliasChoices("userId", "user_id"),
        description="Recipient user ID",
    )
    title: str = Field(..., description="Notification alert headline")
    message: str = Field(..., description="Notification text body")
    notificationType: str = Field(
        "system",
        validation_alias=AliasChoices("notificationType", "notification_type"),
        description="Classification of event triggering alert",
    )
    itemId: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("itemId", "item_id"),
        description="Associated item ID",
    )
    claimId: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("claimId", "claim_id"),
        description="Associated claim ID",
    )
    isRead: bool = Field(
        False,
        validation_alias=AliasChoices("isRead", "is_read", "read"),
        description="Read status flag",
    )
    createdAt: str = Field(
        ...,
        validation_alias=AliasChoices("createdAt", "created_at", "timestamp"),
        description="ISO 8601 creation timestamp",
    )
    link: Optional[str] = Field(
        None,
        description="Direct application route for immediate navigation",
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class NotificationListResponse(BaseModel):
    """Collection of notifications with unread count summary."""

    notifications: List[NotificationResponse] = Field(..., description="List of user notifications")
    total: int = Field(..., description="Total notifications count")
    unreadCount: int = Field(
        0,
        validation_alias=AliasChoices("unreadCount", "unread_count"),
        description="Number of unread notifications",
    )

    model_config = ConfigDict(populate_by_name=True)


class UnreadCountResponse(BaseModel):
    """Unread notification counter."""

    unreadCount: int = Field(
        ...,
        validation_alias=AliasChoices("unreadCount", "unread_count"),
        description="Count of active unread notifications",
    )

    model_config = ConfigDict(populate_by_name=True)
