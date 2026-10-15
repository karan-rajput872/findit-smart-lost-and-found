"""Pydantic request and response schemas for AI match recommendation entities."""

import json
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict, AliasChoices, field_validator
from app.schemas.item import ItemResponse

ConfidenceTierType = Literal["strong", "possible", "weak"]
MatchStatusType = Literal["suggested", "viewed", "dismissed", "claimed"]
FeedbackType = Literal["relevant", "not_relevant", "already_recovered", "duplicate"]


class MatchResponse(BaseModel):
    """Complete match pairing representation returned to authorized clients."""

    id: str = Field(..., description="Unique match identifier")
    lostItemId: str = Field(
        ...,
        validation_alias=AliasChoices("lostItemId", "lost_item_id"),
        description="ID of the lost item report",
    )
    foundItemId: str = Field(
        ...,
        validation_alias=AliasChoices("foundItemId", "found_item_id"),
        description="ID of the found item report",
    )
    lostUserId: str = Field(
        ...,
        validation_alias=AliasChoices("lostUserId", "lost_user_id"),
        description="User ID of the lost item owner",
    )
    foundUserId: str = Field(
        ...,
        validation_alias=AliasChoices("foundUserId", "found_user_id"),
        description="User ID of the found item reporter",
    )
    overallScore: int = Field(
        ...,
        validation_alias=AliasChoices("overallScore", "overall_score"),
        description="Normalized match confidence score (0-100)",
    )
    confidenceTier: str = Field(
        ...,
        validation_alias=AliasChoices("confidenceTier", "confidence_tier"),
        description="Classification tier: strong, possible, or weak",
    )
    titleScore: int = Field(
        0,
        validation_alias=AliasChoices("titleScore", "title_score"),
        description="Title keyword similarity sub-score",
    )
    semanticScore: int = Field(
        0,
        validation_alias=AliasChoices("semanticScore", "semantic_score"),
        description="Semantic description similarity sub-score",
    )
    attributeScore: int = Field(
        0,
        validation_alias=AliasChoices("attributeScore", "attribute_score"),
        description="Category, brand, and color compatibility sub-score",
    )
    locationScore: int = Field(
        0,
        validation_alias=AliasChoices("locationScore", "location_score"),
        description="Campus zone and location proximity sub-score",
    )
    dateScore: int = Field(
        0,
        validation_alias=AliasChoices("dateScore", "date_score"),
        description="Report date window compatibility sub-score",
    )
    imageScore: int = Field(
        50,
        validation_alias=AliasChoices("imageScore", "image_score"),
        description="Visual similarity sub-score",
    )
    explanation: str = Field(..., description="Human-readable match explanation")
    reasons: List[str] = Field(default_factory=list, description="Structured match reason points")
    status: str = Field("suggested", description="Match review status")
    feedback: Optional[str] = Field(None, description="User relevance feedback")
    feedbackNotes: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("feedbackNotes", "feedback_notes"),
        description="User feedback remarks",
    )
    createdAt: str = Field(
        ...,
        validation_alias=AliasChoices("createdAt", "created_at"),
        description="Match discovery timestamp",
    )

    # Embedded related items if joined
    lostItem: Optional[ItemResponse] = Field(
        None,
        validation_alias=AliasChoices("lostItem", "lost_item"),
        description="Full lost item report metadata",
    )
    foundItem: Optional[ItemResponse] = Field(
        None,
        validation_alias=AliasChoices("foundItem", "found_item"),
        description="Full found item report metadata",
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class MatchFeedbackUpdate(BaseModel):
    """Payload to record user feedback on a match recommendation."""

    feedback: FeedbackType = Field(..., description="User feedback classification")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional user commentary")

    model_config = ConfigDict(populate_by_name=True)


class MatchStatusUpdate(BaseModel):
    """Payload to update match lifecycle status."""

    status: MatchStatusType = Field(..., description="Updated match review status")

    model_config = ConfigDict(populate_by_name=True)


class MatchGenerateResponse(BaseModel):
    """Result summary of an on-demand match generation run."""

    generatedCount: int = Field(
        ...,
        validation_alias=AliasChoices("generatedCount", "generated_count"),
        description="Number of newly discovered matches",
    )
    updatedCount: int = Field(
        ...,
        validation_alias=AliasChoices("updatedCount", "updated_count"),
        description="Number of existing matches updated with recalculated scores",
    )
    totalEvaluated: int = Field(
        ...,
        validation_alias=AliasChoices("totalEvaluated", "total_evaluated"),
        description="Total item pairs analyzed",
    )
    message: str = Field(..., description="Execution status summary")

    model_config = ConfigDict(populate_by_name=True)


class MatchListResponse(BaseModel):
    """Paginated collection of matches with metric aggregates."""

    matches: List[MatchResponse] = Field(..., description="List of matched pairings")
    total: int = Field(..., description="Total matches matching query filters")
    strongCount: int = Field(
        0,
        validation_alias=AliasChoices("strongCount", "strong_count"),
        description="Count of strong confidence matches (score >= 80)",
    )
    possibleCount: int = Field(
        0,
        validation_alias=AliasChoices("possibleCount", "possible_count"),
        description="Count of possible confidence matches (50 <= score < 80)",
    )
    weakCount: int = Field(
        0,
        validation_alias=AliasChoices("weakCount", "weak_count"),
        description="Count of weak confidence matches (score < 50)",
    )

    model_config = ConfigDict(populate_by_name=True)
