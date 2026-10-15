"""Pydantic schemas for Item entity."""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict, AliasChoices, field_validator

ItemType = Literal["lost", "found"]
ItemStatus = Literal[
    "open",
    "matched",
    "returned",
    "closed",
    "claimed",
    "resolved",
    "pending_verification",
]


class ItemBase(BaseModel):
    """Base item properties shared across create, update, and response models."""

    title: str = Field(..., min_length=2, max_length=150, description="Item headline or title")
    description: str = Field(..., min_length=3, max_length=3000, description="Comprehensive description of item")
    category: str = Field(..., min_length=2, max_length=100, description="Item classification category")
    type: ItemType = Field(..., description="Report classification ('lost' or 'found')")
    location: str = Field(..., min_length=2, max_length=200, description="Location where lost or found")
    campus: str = Field(
        "Central Campus",
        min_length=2,
        max_length=100,
        description="Campus name or branch location",
    )
    date: str = Field(..., min_length=4, max_length=30, description="Date item was lost or found (YYYY-MM-DD)")
    imageUrl: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("imageUrl", "image_url"),
        description="Public image URL or asset link",
    )
    reporterName: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("reporterName", "reporter_name"),
        description="Name of the person reporting",
    )
    reporterContact: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("reporterContact", "reporter_contact"),
        description="Contact phone or email",
    )

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("imageUrl")
    @classmethod
    def validate_image_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate that imageUrl uses safe URI schemes (http, https, data:image, /)."""
        if not v:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        allowed_prefixes = ("http://", "https://", "data:image/", "/")
        if not any(cleaned.startswith(p) for p in allowed_prefixes):
            raise ValueError("Image URL must use http://, https://, or data:image/ scheme.")
        if len(cleaned) > 7 * 1024 * 1024:
            raise ValueError("Image data exceeds 7MB size limit.")
        return cleaned


class ItemCreate(ItemBase):
    """Payload schema for registering a new lost or found item."""
    pass


class ItemUpdate(BaseModel):
    """Payload schema for partially modifying an existing item."""

    title: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, min_length=3, max_length=3000)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    type: Optional[ItemType] = None
    location: Optional[str] = Field(None, min_length=2, max_length=200)
    campus: Optional[str] = None
    date: Optional[str] = None
    imageUrl: Optional[str] = Field(None, validation_alias=AliasChoices("imageUrl", "image_url"))
    status: Optional[ItemStatus] = None
    reporterName: Optional[str] = Field(None, validation_alias=AliasChoices("reporterName", "reporter_name"))
    reporterContact: Optional[str] = Field(None, validation_alias=AliasChoices("reporterContact", "reporter_contact"))

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("imageUrl")
    @classmethod
    def validate_image_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate that imageUrl uses safe URI schemes (http, https, data:image, /)."""
        if not v:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        allowed_prefixes = ("http://", "https://", "data:image/", "/")
        if not any(cleaned.startswith(p) for p in allowed_prefixes):
            raise ValueError("Image URL must use http://, https://, or data:image/ scheme.")
        if len(cleaned) > 7 * 1024 * 1024:
            raise ValueError("Image data exceeds 7MB size limit.")
        return cleaned


class ItemResponse(ItemBase):
    """Full item representation returned to clients in TypeScript-aligned format."""

    id: str = Field(..., description="Unique item identifier")
    userId: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("userId", "user_id"),
        description="User identifier of the listing creator",
    )
    status: ItemStatus = Field("open", description="Lifecycle status")
    isDemo: bool = Field(
        True,
        validation_alias=AliasChoices("isDemo", "is_demo"),
        description="Indicates in-memory development storage",
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


class ItemListResponse(BaseModel):
    """Paginated collection of items."""

    items: List[ItemResponse] = Field(..., description="List of items matching criteria")
    total: int = Field(..., description="Total matching items count")
    skip: int = Field(0, description="Number of items skipped")
    limit: int = Field(50, description="Maximum items requested")
    storage_mode: str = Field("in_memory_development", description="Current storage backend")


class ItemStatsResponse(BaseModel):
    """Aggregate statistics for lost & found platform dashboard."""

    total_items: int = Field(..., description="Total listings in system")
    lost_items: int = Field(..., description="Total lost listings")
    found_items: int = Field(..., description="Total found listings")
    open_items: int = Field(..., description="Total open listings")
    my_items_count: int = Field(0, description="Total listings by current user")
    my_lost_count: int = Field(0, description="Lost listings by current user")
    my_found_count: int = Field(0, description="Found listings by current user")
    my_open_count: int = Field(0, description="Open listings by current user")

