"""Item management API endpoints."""

import os
import uuid
from datetime import datetime
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File

from app.core.config import settings
from app.api.deps import get_current_user, get_optional_current_user
from app.schemas.user import UserResponse
from app.schemas.item import (
    ItemCreate,
    ItemUpdate,
    ItemResponse,
    ItemListResponse,
    ItemStatsResponse,
    ItemType,
    ItemStatus,
)
from app.services.item_repository import (
    SqlAlchemyItemRepository,
    get_item_repository,
)

router = APIRouter()


@router.get(
    "",
    response_model=ItemListResponse,
    summary="List and filter campus items",
    description="Retrieve paginated lost and found listings with optional keyword, category, and campus filters.",
)
def list_items(
    type: Optional[ItemType] = Query(None, description="Filter by report classification ('lost' or 'found')"),
    category: Optional[str] = Query(None, description="Filter by item category"),
    campus: Optional[str] = Query(None, description="Filter by campus location"),
    status: Optional[ItemStatus] = Query(None, description="Filter by item status"),
    q: Optional[str] = Query(None, description="Free-text search query across title, description, and location"),
    skip: int = Query(0, ge=0, description="Number of items to skip for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Maximum items per page"),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemListResponse:
    """List items with search, filter, and pagination support."""
    items, total = repo.list_items(
        report_type=type,
        category=category,
        campus=campus,
        status=status,
        search_query=q,
        skip=skip,
        limit=limit,
    )
    return ItemListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
        storage_mode=settings.active_storage_mode,
    )


@router.get(
    "/my-listings",
    response_model=ItemListResponse,
    summary="Retrieve current user's submitted listings",
    description="Fetch all lost and found listings submitted by the authenticated user.",
)
def get_my_listings(
    type: Optional[ItemType] = Query(None, description="Filter by type ('lost' or 'found')"),
    status: Optional[ItemStatus] = Query(None, description="Filter by item status"),
    q: Optional[str] = Query(None, description="Keyword search in user's items"),
    skip: int = Query(0, ge=0, description="Pagination skip offset"),
    limit: int = Query(50, ge=1, le=100, description="Maximum items to return"),
    current_user: UserResponse = Depends(get_current_user),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemListResponse:
    """Retrieve listings owned by the authenticated caller."""
    items, total = repo.list_user_items(
        user_id=current_user.id,
        report_type=type,
        status=status,
        search_query=q,
        skip=skip,
        limit=limit,
    )
    return ItemListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
        storage_mode=settings.active_storage_mode,
    )


@router.get(
    "/stats",
    response_model=ItemStatsResponse,
    summary="Retrieve platform and user listing statistics",
    description="Aggregated count of total, lost, found, and open items, with user-specific metrics if authenticated.",
)
def get_item_stats(
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemStatsResponse:
    """Retrieve system and optional user stats."""
    user_id = current_user.id if current_user else None
    stats_dict = repo.get_stats(user_id=user_id)
    return ItemStatsResponse(**stats_dict)


@router.get(
    "/{item_id}",
    response_model=ItemResponse,
    summary="Retrieve single item by ID",
    description="Fetch comprehensive metadata and current status for a specific item listing.",
)
def get_item(
    item_id: str,
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemResponse:
    """Fetch item by its ID."""
    item = repo.get_by_id(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID '{item_id}' not found.",
        )
    return item


@router.post(
    "/upload-image",
    summary="Upload item photograph",
    description="Upload a photograph for a lost or found item. Validates image type and restricts size.",
)
async def upload_item_image(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
) -> Dict[str, str]:
    """Upload and persistently store an item photograph."""
    content_type = (file.content_type or "").lower()
    if content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Allowed types: PNG, JPEG, WEBP, GIF.",
        )

    filename = file.filename or "image.png"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .webp, .gif",
        )

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    from app.services.storage_service import upload_image_to_storage
    return upload_image_to_storage(contents=contents, ext=ext, original_filename=filename)


@router.post(
    "",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lost or found item report",
    description="Submit a new campus lost or found item report. Requires authentication.",
)
def create_item(
    item_in: ItemCreate,
    current_user: UserResponse = Depends(get_current_user),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemResponse:
    """Create item report associated with the authenticated user."""
    # Ensure reporter metadata reflects current user if not explicitly provided
    if not item_in.reporterName:
        item_in.reporterName = current_user.fullName
    if not item_in.reporterContact:
        item_in.reporterContact = current_user.email

    created = repo.create(item_in, user_id=current_user.id)
    return created


def _verify_item_ownership(
    item: ItemResponse,
    current_user: UserResponse,
    action: str,
) -> None:
    """Check that current user owns the listing, or is an admin."""
    if current_user.role != "admin":
        if not item.userId or item.userId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to {action} this listing.",
            )


@router.patch(
    "/{item_id}",
    response_model=ItemResponse,
    summary="Update item details or status",
    description="Partially modify the properties or lifecycle status of an existing item. Requires ownership.",
)
def update_item(
    item_id: str,
    item_update: ItemUpdate,
    current_user: UserResponse = Depends(get_current_user),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemResponse:
    """Update existing item after verifying caller ownership."""
    existing = repo.get_by_id(item_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID '{item_id}' not found.",
        )

    _verify_item_ownership(existing, current_user, "modify")

    updated = repo.update(item_id, item_update)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID '{item_id}' not found.",
        )
    return updated


@router.put(
    "/{item_id}",
    response_model=ItemResponse,
    summary="Update item details or status (PUT alias)",
    description="Update listing properties or status. Requires ownership.",
)
def put_update_item(
    item_id: str,
    item_update: ItemUpdate,
    current_user: UserResponse = Depends(get_current_user),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemResponse:
    """PUT alias for updating existing item."""
    return update_item(
        item_id=item_id,
        item_update=item_update,
        current_user=current_user,
        repo=repo,
    )


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete item listing",
    description="Remove an item listing from the system. Requires ownership.",
)
def delete_item(
    item_id: str,
    current_user: UserResponse = Depends(get_current_user),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> None:
    """Delete item after verifying caller ownership."""
    existing = repo.get_by_id(item_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID '{item_id}' not found.",
        )

    _verify_item_ownership(existing, current_user, "delete")

    success = repo.delete(item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID '{item_id}' not found.",
        )
    return None

