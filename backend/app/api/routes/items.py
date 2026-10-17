"""Item management API endpoints."""

import os
import uuid
from datetime import datetime
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File

from app.core.config import settings
from app.api.deps import get_current_user, get_optional_current_user
from app.core.rate_limit import apply_rate_limit, get_client_ip
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


def validate_and_verify_image(contents: bytes) -> str:
    """Validate image bytes, magic signatures, Pillow decodability, pixel bounds, and integrity.

    Guarantees:
    - Rejection of malformed/truncated images (via verify())
    - Protection against decompression bomb denial of service (Image.MAX_IMAGE_PIXELS = 25_000_000)
    - Reasonable dimensions limit (max 8000x8000)
    - Rejection of non-image executables or scripts disguised as images
    """
    if len(contents) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content is too small or corrupted to be a valid image.",
        )
    # Binary magic header inspection
    has_magic = (
        contents[:3] == b"\xff\xd8\xff"
        or contents[:8] == b"\x89PNG\r\n\x1a\n"
        or contents[:6] in (b"GIF87a", b"GIF89a")
        or (contents[:4] == b"RIFF" and contents[8:12] == b"WEBP")
    )
    if not has_magic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file content: The file binary header does not match an allowed image format (PNG, JPEG, WEBP, GIF).",
        )

    # Deep decoding and integrity verification via maintained PIL library
    try:
        from PIL import Image, ImageFile
        import io

        # Configure safe pixel limits to protect against decompression bombs
        Image.MAX_IMAGE_PIXELS = 25_000_000
        ImageFile.LOAD_TRUNCATED_IMAGES = False

        with Image.open(io.BytesIO(contents)) as img:
            fmt = (img.format or "").upper()
            if fmt not in ("JPEG", "PNG", "WEBP", "GIF"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Decoded image format '{fmt}' is not supported. Allowed formats: PNG, JPEG, WEBP, GIF.",
                )

            width, height = img.size
            if width <= 0 or height <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid image dimensions: dimensions must be greater than zero.",
                )
            if width > 8000 or height > 8000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image dimensions exceed maximum allowable limit (8000x8000 pixels).",
                )

            # Deep structure verification (detects truncated or corrupted chunks)
            img.verify()
            return fmt.lower()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed or corrupted image file rejected: {str(e)}",
        )


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
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
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
    # Privacy protection: Redact personal reporterContact on public browse listing
    is_admin = current_user is not None and current_user.role == "admin"
    sanitized_items = []
    for item in items:
        if is_admin or (current_user and item.userId and item.userId == current_user.id):
            sanitized_items.append(item)
        else:
            sanitized_items.append(item.model_copy(update={"reporterContact": None}))

    return ItemListResponse(
        items=sanitized_items,
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
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    repo: SqlAlchemyItemRepository = Depends(get_item_repository),
) -> ItemResponse:
    """Fetch item by its ID with contact information privacy protection."""
    item = repo.get_by_id(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item with ID '{item_id}' not found.",
        )

    # Privacy protection: Redact personal reporterContact unless caller is owner or admin
    is_owner_or_admin = current_user is not None and (
        current_user.role == "admin" or (item.userId and item.userId == current_user.id)
    )
    if not is_owner_or_admin:
        item = item.model_copy(update={"reporterContact": None})

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
    """Upload and persistently store an item photograph with validation and rate limiting."""
    # Apply rate limiting per authenticated user (20 uploads per minute)
    apply_rate_limit(
        key=f"upload:{current_user.id}",
        max_requests=20,
        window_seconds=60,
        error_message="Too many image upload attempts. Please wait before uploading another photograph.",
    )

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

    # Deep binary and structural image inspection via Pillow
    validate_and_verify_image(contents)

    from app.services.storage_service import upload_image_to_storage
    try:
        return upload_image_to_storage(contents=contents, ext=ext, original_filename=filename)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


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

