"""AI Match recommendation and evaluation endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.schemas.user import UserResponse
from app.schemas.match import (
    MatchResponse,
    MatchListResponse,
    MatchFeedbackUpdate,
    MatchStatusUpdate,
    MatchGenerateResponse,
)
from app.services.match_repository import (
    SqlAlchemyMatchRepository,
    get_match_repository,
)

router = APIRouter()


@router.get(
    "",
    response_model=MatchListResponse,
    summary="List AI match recommendations",
    description="Retrieve authorized AI-discovered matches between lost and found items with multi-signal score metrics.",
)
def list_matches(
    tier: Optional[str] = Query(None, description="Filter by confidence tier: strong, possible, or weak"),
    min_score: Optional[int] = Query(None, ge=0, le=100, description="Minimum overall score (0-100)"),
    category: Optional[str] = Query(None, description="Filter by item category keyword"),
    feedback: Optional[str] = Query(None, description="Filter by feedback: relevant, not_relevant, etc."),
    item_id: Optional[str] = Query(None, description="Filter matches relating to a specific item ID"),
    lost_item_id: Optional[str] = Query(None, description="Filter matches for a specific lost item ID"),
    found_item_id: Optional[str] = Query(None, description="Filter matches for a specific found item ID"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=100, description="Page size limit"),
    current_user: UserResponse = Depends(get_current_user),
    match_repo: SqlAlchemyMatchRepository = Depends(get_match_repository),
) -> MatchListResponse:
    """List match pairings for the current authenticated user."""
    is_admin = current_user.role == "admin"
    return match_repo.get_matches(
        user_id=current_user.id,
        is_admin=is_admin,
        tier=tier,
        min_score=min_score,
        category=category,
        feedback=feedback,
        item_id=item_id,
        lost_item_id=lost_item_id,
        found_item_id=found_item_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{match_id}",
    response_model=MatchResponse,
    summary="Get single match recommendation",
    description="Retrieve detailed multi-signal scoring, explanations, and linked item summaries for a specific match.",
)
def get_match(
    match_id: str,
    current_user: UserResponse = Depends(get_current_user),
    match_repo: SqlAlchemyMatchRepository = Depends(get_match_repository),
) -> MatchResponse:
    """Get single match by ID."""
    is_admin = current_user.role == "admin"
    match = match_repo.get_match_by_id(match_id, current_user.id, is_admin=is_admin)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match recommendation not found or unauthorized.",
        )
    return match


@router.post(
    "/generate",
    response_model=MatchGenerateResponse,
    summary="Generate or recalculate AI matches",
    description="Scan active lost and found items using multi-signal text, attribute, and location algorithms.",
)
def generate_matches(
    current_user: UserResponse = Depends(get_current_user),
    match_repo: SqlAlchemyMatchRepository = Depends(get_match_repository),
) -> MatchGenerateResponse:
    """Run full matching sweep."""
    generated, updated, total = match_repo.generate_all_matches()
    return MatchGenerateResponse(
        generatedCount=generated,
        updatedCount=updated,
        totalEvaluated=total,
        message=f"Evaluation complete: {generated} new matches identified, {updated} updated across {total} item comparisons.",
    )


@router.patch(
    "/{match_id}/feedback",
    response_model=MatchResponse,
    summary="Submit user feedback on match quality",
    description="Record whether an AI recommendation was relevant, not relevant, already recovered, or duplicate.",
)
def submit_feedback(
    match_id: str,
    payload: MatchFeedbackUpdate,
    current_user: UserResponse = Depends(get_current_user),
    match_repo: SqlAlchemyMatchRepository = Depends(get_match_repository),
) -> MatchResponse:
    """Submit feedback on match."""
    is_admin = current_user.role == "admin"
    updated = match_repo.record_feedback(
        match_id=match_id,
        feedback=payload.feedback,
        notes=payload.notes,
        user_id=current_user.id,
        is_admin=is_admin,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found or unauthorized to submit feedback.",
        )
    return updated


@router.patch(
    "/{match_id}/status",
    response_model=MatchResponse,
    summary="Update match status",
    description="Update review lifecycle status (e.g., viewed, dismissed, claimed).",
)
def update_status(
    match_id: str,
    payload: MatchStatusUpdate,
    current_user: UserResponse = Depends(get_current_user),
    match_repo: SqlAlchemyMatchRepository = Depends(get_match_repository),
) -> MatchResponse:
    """Update match review status."""
    is_admin = current_user.role == "admin"
    updated = match_repo.update_status(
        match_id=match_id,
        status=payload.status,
        user_id=current_user.id,
        is_admin=is_admin,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found or unauthorized.",
        )
    return updated
