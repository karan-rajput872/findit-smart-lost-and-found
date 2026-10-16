"""Pydantic schemas for return coordination chat messages."""

import html
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, AliasChoices, field_validator


class MessageCreate(BaseModel):
    """Payload to send a message within an approved claim conversation."""

    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Text message body (1 to 2000 characters)",
    )

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("content")
    @classmethod
    def sanitize_and_trim(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message content cannot be empty.")
        # Basic HTML escaping for safe display
        return html.escape(trimmed)


class MessageResponse(BaseModel):
    """Message object returned to authorized conversation participants."""

    id: str = Field(..., description="Unique message identifier")
    claimId: str = Field(
        ...,
        validation_alias=AliasChoices("claimId", "claim_id"),
        description="Associated approved claim ID",
    )
    senderId: str = Field(
        ...,
        validation_alias=AliasChoices("senderId", "sender_id"),
        description="Sender user identifier",
    )
    senderName: str = Field(
        ...,
        validation_alias=AliasChoices("senderName", "sender_name"),
        description="Sender full name",
    )
    recipientId: str = Field(
        ...,
        validation_alias=AliasChoices("recipientId", "recipient_id"),
        description="Recipient user identifier",
    )
    content: str = Field(..., description="Sanitized message body")
    isRead: bool = Field(
        False,
        validation_alias=AliasChoices("isRead", "is_read"),
        description="Whether recipient has read the message",
    )
    createdAt: str = Field(
        ...,
        validation_alias=AliasChoices("createdAt", "created_at"),
        description="ISO 8601 creation timestamp",
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class MessageListResponse(BaseModel):
    """List of messages for a claim conversation."""

    messages: List[MessageResponse] = Field(..., description="List of ordered messages")
    total: int = Field(..., description="Count of messages returned")

    model_config = ConfigDict(populate_by_name=True)


class ConversationSummary(BaseModel):
    """Summary of an active return coordination conversation for the user."""

    claimId: str = Field(
        ...,
        validation_alias=AliasChoices("claimId", "claim_id"),
        description="Claim ID",
    )
    itemId: str = Field(
        ...,
        validation_alias=AliasChoices("itemId", "item_id"),
        description="Associated item ID",
    )
    itemTitle: str = Field(
        ...,
        validation_alias=AliasChoices("itemTitle", "item_title"),
        description="Item title",
    )
    itemType: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("itemType", "item_type"),
        description="lost or found",
    )
    claimStatus: str = Field(
        ...,
        validation_alias=AliasChoices("claimStatus", "claim_status"),
        description="Claim verification status",
    )
    otherPartyId: str = Field(
        ...,
        validation_alias=AliasChoices("otherPartyId", "other_party_id"),
        description="ID of the other person in the conversation",
    )
    otherPartyName: str = Field(
        ...,
        validation_alias=AliasChoices("otherPartyName", "other_party_name"),
        description="Full name of the other person",
    )
    otherPartyAvatar: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("otherPartyAvatar", "other_party_avatar"),
        description="Avatar URL of other person",
    )
    lastMessage: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("lastMessage", "last_message"),
        description="Text of most recent message",
    )
    lastMessageTime: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("lastMessageTime", "last_message_time"),
        description="Timestamp of most recent message",
    )
    unreadCount: int = Field(
        0,
        validation_alias=AliasChoices("unreadCount", "unread_count"),
        description="Count of unread messages for current user",
    )

    model_config = ConfigDict(populate_by_name=True)


class ConversationListResponse(BaseModel):
    """List of active coordination conversations."""

    conversations: List[ConversationSummary] = Field(..., description="Active conversations")
    total: int = Field(..., description="Total conversations")

    model_config = ConfigDict(populate_by_name=True)
