"""Pydantic schemas for Claim entities."""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict, AliasChoices

ClaimStatusType = Literal[
    "pending",
    "under_review",
    "approved",
    "rejected",
    "completed",
    "cancelled",
]

HandoverStatusType = Literal[
    "awaiting_handover",
    "handover_arranged",
    "returned_successfully",
]


class ClaimCreate(BaseModel):
    """Payload to submit an item ownership verification claim."""

    itemId: str = Field(
        ...,
        validation_alias=AliasChoices("itemId", "item_id"),
        description="ID of the found item being claimed",
    )
    description: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Explanation of why this item belongs to the claimant",
    )
    proofDetails: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("proofDetails", "proof_details", "proofDescription", "proof_description"),
        max_length=3000,
        description="Confidential identifying details (serial numbers, hidden markings, contents)",
    )

    model_config = ConfigDict(populate_by_name=True)


class ClaimReview(BaseModel):
    """Payload for item reporter/admin to review a submitted claim."""

    status: Literal["under_review", "approved", "rejected"] = Field(
        ...,
        description="Updated claim status",
    )
    reviewNotes: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("reviewNotes", "review_notes"),
        max_length=1500,
        description="Feedback or verification decision explanation for the claimant",
    )

    model_config = ConfigDict(populate_by_name=True)


class ClaimHandover(BaseModel):
    """Payload to coordinate physical return arrangements."""

    handoverStatus: HandoverStatusType = Field(
        ...,
        validation_alias=AliasChoices("handoverStatus", "handover_status"),
        description="Status of physical handover coordination",
    )
    handoverDetails: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("handoverDetails", "handover_details"),
        max_length=1500,
        description="Meeting location, schedule, or desk pickup arrangement notes",
    )

    model_config = ConfigDict(populate_by_name=True)


class ClaimComplete(BaseModel):
    """Payload to confirm physical item return and close claim."""

    completionNotes: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("completionNotes", "completion_notes"),
        max_length=1000,
        description="Optional final confirmation remarks upon item return",
    )

    model_config = ConfigDict(populate_by_name=True)


class ClaimResponse(BaseModel):
    """Claim representation returned to authorized clients."""

    id: str = Field(..., description="Unique claim identifier")
    itemId: str = Field(
        ...,
        validation_alias=AliasChoices("itemId", "item_id"),
        description="Associated item listing ID",
    )
    itemTitle: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("itemTitle", "item_title"),
        description="Title of associated item",
    )
    itemType: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("itemType", "item_type"),
        description="Type of item (lost/found)",
    )
    itemCategory: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("itemCategory", "item_category"),
        description="Category of associated item",
    )
    claimantId: str = Field(
        ...,
        validation_alias=AliasChoices("claimantId", "claimant_id"),
        description="User ID of claimant",
    )
    claimantName: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("claimantName", "claimant_name"),
        description="Full name of claimant",
    )
    claimantEmail: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("claimantEmail", "claimant_email"),
        description="Contact email of claimant",
    )
    itemOwnerId: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("itemOwnerId", "item_owner_id"),
        description="User ID of item reporter/owner",
    )
    itemOwnerName: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("itemOwnerName", "item_owner_name"),
        description="Full name of item reporter/owner",
    )
    description: str = Field(..., description="Claim explanation")
    proofDetails: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("proofDetails", "proof_details"),
        description="Private ownership verification proof (authorized eyes only)",
    )
    status: ClaimStatusType = Field("pending", description="Current claim status")
    reviewNotes: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("reviewNotes", "review_notes"),
        description="Reviewer notes or guidance",
    )
    handoverStatus: Optional[HandoverStatusType] = Field(
        None,
        validation_alias=AliasChoices("handoverStatus", "handover_status"),
        description="Status of physical handover coordination",
    )
    handoverDetails: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("handoverDetails", "handover_details"),
        description="Arrangement instructions or meeting point",
    )
    claimantContactShared: bool = Field(
        False,
        validation_alias=AliasChoices("claimantContactShared", "claimant_contact_shared"),
        description="Whether claimant has consented to share contact info",
    )
    ownerContactShared: bool = Field(
        False,
        validation_alias=AliasChoices("ownerContactShared", "owner_contact_shared"),
        description="Whether finder has consented to share contact info",
    )
    createdAt: str = Field(
        ...,
        validation_alias=AliasChoices("createdAt", "created_at"),
        description="ISO 8601 creation timestamp",
    )
    updatedAt: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("updatedAt", "updated_at"),
        description="ISO 8601 last update timestamp",
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ClaimContactConsent(BaseModel):
    """Payload to grant or revoke contact sharing consent for an approved claim."""

    consent: bool = Field(..., description="Whether user grants explicit consent to share contact details")

    model_config = ConfigDict(populate_by_name=True)


class ContactInfoResponse(BaseModel):
    """Secure contact details returned strictly when claim is approved and mutual consent is given."""

    mutualConsent: bool = Field(
        ...,
        validation_alias=AliasChoices("mutualConsent", "mutual_consent"),
        description="Whether both parties have granted explicit consent",
    )
    userConsent: bool = Field(
        ...,
        validation_alias=AliasChoices("userConsent", "user_consent"),
        description="Whether current user has granted consent",
    )
    otherPartyConsent: bool = Field(
        ...,
        validation_alias=AliasChoices("otherPartyConsent", "other_party_consent"),
        description="Whether other party has granted consent",
    )
    otherPartyRole: str = Field(
        ...,
        validation_alias=AliasChoices("otherPartyRole", "other_party_role"),
        description="finder or claimant",
    )
    otherPartyName: str = Field(
        ...,
        validation_alias=AliasChoices("otherPartyName", "other_party_name"),
        description="Full name of other party",
    )
    preferredMethod: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("preferredMethod", "preferred_method"),
        description="findit_chat, whatsapp, or phone_call",
    )
    phoneNumber: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("phoneNumber", "phone_number"),
        description="Private phone number (only if mutual consent)",
    )
    whatsappNumber: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("whatsappNumber", "whatsapp_number"),
        description="Private WhatsApp number (only if mutual consent)",
    )
    whatsappUrl: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("whatsappUrl", "whatsapp_url"),
        description="Safe pre-filled WhatsApp click-to-chat URL",
    )
    canChat: bool = Field(
        True,
        validation_alias=AliasChoices("canChat", "can_chat"),
        description="Whether internal FindIt chat is accessible",
    )

    model_config = ConfigDict(populate_by_name=True)


class ClaimListResponse(BaseModel):
    """Collection of claims for user or reporter."""

    claims: List[ClaimResponse] = Field(..., description="List of claims")
    total: int = Field(..., description="Total matching claims count")

    model_config = ConfigDict(populate_by_name=True)
