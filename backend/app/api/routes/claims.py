"""API endpoints for claim management and item return coordination."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user
from app.schemas.user import UserResponse
from app.schemas.claim import (
    ClaimCreate,
    ClaimReview,
    ClaimHandover,
    ClaimComplete,
    ClaimResponse,
    ClaimListResponse,
)
from app.services.claim_repository import (
    SqlAlchemyClaimRepository,
    get_claim_repository,
)

router = APIRouter()


@router.post(
    "",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit an ownership claim for a found item",
)
def submit_claim(
    claim_in: ClaimCreate,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimResponse:
    """Submit an ownership verification claim for a listed item.

    Validates that:
    - The item exists.
    - The claimant is not claiming their own reported item.
    - No active duplicate claim exists from this claimant for the same item.
    """
    return claim_repo.submit_claim(claim_in, claimant_id=current_user.id)


@router.get(
    "/my-claims",
    response_model=ClaimListResponse,
    summary="List claims submitted by the authenticated user",
)
def list_my_claims(
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, etc.)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimListResponse:
    """Retrieve all claims submitted by the current authenticated user."""
    claims, total = claim_repo.list_my_claims(
        claimant_id=current_user.id,
        status_filter=status,
        skip=skip,
        limit=limit,
    )
    return ClaimListResponse(claims=claims, total=total)


@router.get(
    "/received",
    response_model=ClaimListResponse,
    summary="List incoming claims received for items reported by the user",
)
def list_received_claims(
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimListResponse:
    """Retrieve claims received for items reported by the authenticated user."""
    claims, total = claim_repo.list_received_claims(
        owner_id=current_user.id,
        status_filter=status,
        skip=skip,
        limit=limit,
    )
    return ClaimListResponse(claims=claims, total=total)


@router.get(
    "/{claim_id}",
    response_model=ClaimResponse,
    summary="Get claim details",
)
def get_claim(
    claim_id: str,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimResponse:
    """Get single claim details with strict ownership and authorization checks."""
    is_admin = current_user.role == "admin"
    return claim_repo.get_claim_by_id(
        claim_id=claim_id,
        current_user_id=current_user.id,
        is_admin=is_admin,
    )


@router.patch(
    "/{claim_id}/review",
    response_model=ClaimResponse,
    summary="Review claim (approve, reject, or mark under_review)",
)
def review_claim(
    claim_id: str,
    review_in: ClaimReview,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimResponse:
    """Approve or reject a claim request. Only the item reporter or admin is authorized."""
    is_admin = current_user.role == "admin"
    return claim_repo.review_claim(
        claim_id=claim_id,
        review_in=review_in,
        reviewer_id=current_user.id,
        is_admin=is_admin,
    )


@router.patch(
    "/{claim_id}/handover",
    response_model=ClaimResponse,
    summary="Update return handover arrangements",
)
def update_handover(
    claim_id: str,
    handover_in: ClaimHandover,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimResponse:
    """Coordinate handover instructions or meeting arrangements."""
    is_admin = current_user.role == "admin"
    return claim_repo.update_handover(
        claim_id=claim_id,
        handover_in=handover_in,
        user_id=current_user.id,
        is_admin=is_admin,
    )


@router.post(
    "/{claim_id}/complete",
    response_model=ClaimResponse,
    summary="Confirm physical return handover and resolve item",
)
def complete_return(
    claim_id: str,
    complete_in: Optional[ClaimComplete] = None,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimResponse:
    """Confirm that the item has been physically handed over to the claimant.

    Atomically:
    - Marks claim status as 'completed'
    - Marks handover_status as 'returned_successfully'
    - Updates associated item status to 'returned'
    - Notifies the claimant
    """
    is_admin = current_user.role == "admin"
    return claim_repo.complete_return(
        claim_id=claim_id,
        user_id=current_user.id,
        complete_in=complete_in,
        is_admin=is_admin,
    )


@router.post(
    "/{claim_id}/cancel",
    response_model=ClaimResponse,
    summary="Cancel a pending or under-review claim",
)
def cancel_claim(
    claim_id: str,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimResponse:
    """Cancel a claim previously submitted by the current user."""
    is_admin = current_user.role == "admin"
    return claim_repo.cancel_claim(
        claim_id=claim_id,
        claimant_id=current_user.id,
        is_admin=is_admin,
    )
