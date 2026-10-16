"""API endpoints for claim management and item return coordination."""

from typing import Optional, List
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
    ClaimContactConsent,
    ContactInfoResponse,
)
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    ConversationListResponse,
)
from app.services.claim_repository import (
    SqlAlchemyClaimRepository,
    get_claim_repository,
)
from app.services.message_repository import (
    SqlAlchemyMessageRepository,
    get_message_repository,
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
    "/conversations/active",
    response_model=ConversationListResponse,
    summary="List active coordination conversations for current user",
)
def list_active_conversations(
    current_user: UserResponse = Depends(get_current_user),
    message_repo: SqlAlchemyMessageRepository = Depends(get_message_repository),
) -> ConversationListResponse:
    """Retrieve all conversations for approved or completed claims with unread counts."""
    convs = message_repo.list_active_conversations(user_id=current_user.id)
    return ConversationListResponse(conversations=convs, total=len(convs))


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


@router.get(
    "/{claim_id}/contact",
    response_model=ContactInfoResponse,
    summary="Get counterpart contact details under mutual consent",
    description="Returns phone and WhatsApp contact details only if claim is approved and BOTH parties have given explicit consent.",
)
def get_claim_contact(
    claim_id: str,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ContactInfoResponse:
    """Retrieve counterpart contact details strictly under mutual consent."""
    return claim_repo.get_contact_info(claim_id=claim_id, user_id=current_user.id)


@router.post(
    "/{claim_id}/contact-consent",
    response_model=ClaimResponse,
    summary="Grant or revoke contact sharing consent for this approved claim",
)
def set_contact_consent(
    claim_id: str,
    consent_in: ClaimContactConsent,
    current_user: UserResponse = Depends(get_current_user),
    claim_repo: SqlAlchemyClaimRepository = Depends(get_claim_repository),
) -> ClaimResponse:
    """Toggle contact sharing consent for the authenticated user on an approved claim."""
    return claim_repo.set_contact_consent(
        claim_id=claim_id,
        user_id=current_user.id,
        consent=consent_in.consent,
    )


@router.get(
    "/{claim_id}/messages",
    response_model=MessageListResponse,
    summary="Get conversation message history for an approved claim",
)
def get_claim_messages(
    claim_id: str,
    current_user: UserResponse = Depends(get_current_user),
    message_repo: SqlAlchemyMessageRepository = Depends(get_message_repository),
) -> MessageListResponse:
    """Retrieve all messages for an approved claim and mark unread incoming messages as read."""
    messages = message_repo.get_claim_messages(claim_id=claim_id, user_id=current_user.id)
    return MessageListResponse(messages=messages, total=len(messages))


@router.post(
    "/{claim_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message within an approved claim conversation",
)
def send_claim_message(
    claim_id: str,
    message_in: MessageCreate,
    current_user: UserResponse = Depends(get_current_user),
    message_repo: SqlAlchemyMessageRepository = Depends(get_message_repository),
) -> MessageResponse:
    """Post a new message to the counterpart on an approved claim."""
    return message_repo.send_message(
        claim_id=claim_id,
        sender_id=current_user.id,
        message_in=message_in,
    )

