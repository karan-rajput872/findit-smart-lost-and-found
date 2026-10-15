"""Persistent SQLAlchemy Claim Repository for Lost & Found Ownership Verification."""

import uuid
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import desc, or_, and_
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.params import Depends as DependsType

from app.db.session import get_db, SessionLocal
from app.models.claim import Claim, ClaimStatus, HandoverStatus
from app.models.item import Item
from app.models.user import User
from app.schemas.claim import (
    ClaimCreate,
    ClaimReview,
    ClaimHandover,
    ClaimComplete,
    ClaimResponse,
)
from app.services.notification_repository import SqlAlchemyNotificationRepository


class SqlAlchemyClaimRepository:
    """Manages claim submissions, reviews, handovers, and return coordination."""

    def __init__(self, db: Session):
        self.db = db
        self.notif_repo = SqlAlchemyNotificationRepository(db)

    def _to_response(
        self,
        claim: Claim,
        current_user_id: Optional[str] = None,
        is_admin: bool = False,
    ) -> ClaimResponse:
        """Convert database model to ClaimResponse schema with ownership privacy protection."""
        created_iso = (
            claim.created_at.isoformat()
            if hasattr(claim.created_at, "isoformat")
            else str(claim.created_at)
        )
        if not created_iso.endswith("Z") and "+" not in created_iso:
            created_iso += "Z"

        updated_iso = None
        if claim.updated_at:
            updated_iso = (
                claim.updated_at.isoformat()
                if hasattr(claim.updated_at, "isoformat")
                else str(claim.updated_at)
            )
            if not updated_iso.endswith("Z") and "+" not in updated_iso:
                updated_iso += "Z"

        # Determine authorization to see private ownership proof
        is_authorized = (
            is_admin
            or (current_user_id is not None and current_user_id == claim.claimant_id)
            or (current_user_id is not None and current_user_id == claim.item_owner_id)
        )
        proof = claim.proof_details if is_authorized else None

        item_title = claim.item.title if claim.item else None
        item_type = claim.item.type if claim.item else None
        item_category = claim.item.category if claim.item else None

        claimant_name = claim.claimant.full_name if claim.claimant else None
        claimant_email = claim.claimant.email if (claim.claimant and is_authorized) else None

        item_owner_name = claim.item_owner.full_name if claim.item_owner else None

        return ClaimResponse(
            id=claim.id,
            itemId=claim.item_id,
            itemTitle=item_title,
            itemType=item_type,
            itemCategory=item_category,
            claimantId=claim.claimant_id,
            claimantName=claimant_name,
            claimantEmail=claimant_email,
            itemOwnerId=claim.item_owner_id,
            itemOwnerName=item_owner_name,
            description=claim.description,
            proofDetails=proof,
            status=claim.status,  # type: ignore[arg-type]
            reviewNotes=claim.review_notes,
            handoverStatus=claim.handover_status,  # type: ignore[arg-type]
            handoverDetails=claim.handover_details,
            createdAt=created_iso,
            updatedAt=updated_iso,
        )

    def submit_claim(self, claim_in: ClaimCreate, claimant_id: str) -> ClaimResponse:
        """Submit a new ownership verification claim with validation checks."""
        # 1. Fetch item
        item = self.db.query(Item).filter(Item.id == claim_in.itemId).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item with ID '{claim_in.itemId}' not found.",
            )

        # 2. Prevent claiming an item that is already returned or resolved
        if item.status and item.status.lower() in ["returned", "resolved"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item is already marked as {item.status} and cannot be claimed.",
            )

        # 3. Prevent claiming one's own reported item
        if item.user_id and item.user_id == claimant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot claim an item you reported yourself.",
            )

        # 4. Prevent duplicate active claims
        active_statuses = ["pending", "under_review", "approved"]
        existing_claim = (
            self.db.query(Claim)
            .filter(
                Claim.item_id == claim_in.itemId,
                Claim.claimant_id == claimant_id,
                Claim.status.in_(active_statuses),
            )
            .first()
        )
        if existing_claim:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active claim pending or approved for this item.",
            )

        # 4. Create and save new claim
        claim_id = f"clm_{uuid.uuid4().hex[:12]}"
        new_claim = Claim(
            id=claim_id,
            item_id=item.id,
            claimant_id=claimant_id,
            item_owner_id=item.user_id,
            description=claim_in.description.strip(),
            proof_details=claim_in.proofDetails.strip() if claim_in.proofDetails else None,
            status=ClaimStatus.PENDING.value,
            handover_status=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(new_claim)
        self.db.commit()
        self.db.refresh(new_claim)

        # 5. Notify item reporter (if registered)
        if item.user_id:
            self.notif_repo.create(
                user_id=item.user_id,
                title="New Claim Received",
                message=f"A campus member submitted an ownership claim for your found item '{item.title}'.",
                notification_type="claim_submitted",
                item_id=item.id,
                claim_id=claim_id,
            )

        # 6. Notify claimant of successful submission
        self.notif_repo.create(
            user_id=claimant_id,
            title="Claim Submitted",
            message=f"Your claim for '{item.title}' has been submitted and is pending verification.",
            notification_type="claim_submitted",
            item_id=item.id,
            claim_id=claim_id,
        )

        return self._to_response(new_claim, current_user_id=claimant_id)

    def list_my_claims(
        self,
        claimant_id: str,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[ClaimResponse], int]:
        """Fetch claims submitted by the current user."""
        query = self.db.query(Claim).filter(Claim.claimant_id == claimant_id)
        if status_filter and status_filter.lower() != "all":
            query = query.filter(Claim.status == status_filter.lower())
        total = query.count()
        records = (
            query.order_by(desc(Claim.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return (
            [self._to_response(r, current_user_id=claimant_id) for r in records],
            total,
        )

    def list_received_claims(
        self,
        owner_id: str,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[ClaimResponse], int]:
        """Fetch claims received for items reported by the current user."""
        query = self.db.query(Claim).filter(Claim.item_owner_id == owner_id)
        if status_filter and status_filter.lower() != "all":
            query = query.filter(Claim.status == status_filter.lower())
        total = query.count()
        records = (
            query.order_by(desc(Claim.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return (
            [self._to_response(r, current_user_id=owner_id) for r in records],
            total,
        )

    def get_claim_by_id(
        self,
        claim_id: str,
        current_user_id: str,
        is_admin: bool = False,
    ) -> ClaimResponse:
        """Retrieve single claim with strict authorization check."""
        claim = self.db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Claim with ID '{claim_id}' not found.",
            )

        is_authorized = (
            is_admin
            or (claim.claimant_id == current_user_id)
            or (claim.item_owner_id == current_user_id)
        )
        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this claim.",
            )

        return self._to_response(claim, current_user_id=current_user_id, is_admin=is_admin)

    def review_claim(
        self,
        claim_id: str,
        review_in: ClaimReview,
        reviewer_id: str,
        is_admin: bool = False,
    ) -> ClaimResponse:
        """Review an incoming claim (approve, reject, or mark under_review)."""
        claim = self.db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Claim with ID '{claim_id}' not found.",
            )

        # 1. Enforce reviewer authorization
        is_owner = claim.item_owner_id == reviewer_id or (
            claim.item and claim.item.user_id == reviewer_id
        )
        if not is_owner and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the authorized item reporter or administrator can review this claim.",
            )

        # 2. Claimant cannot review or approve their own claim
        if claim.claimant_id == reviewer_id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Claimants cannot review or approve their own claim requests.",
            )

        # 3. Status transitions validation
        current_status = claim.status.lower()
        target_status = review_in.status.lower()

        if current_status in ["completed", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot review a claim that is already {current_status}.",
            )

        if current_status == "rejected" and target_status not in ["approved", "under_review"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change status of a rejected claim to that state.",
            )

        # 4. Cannot approve claim for an item already marked returned/resolved
        if target_status == "approved" and claim.item and claim.item.status and claim.item.status.lower() in ["returned", "resolved"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve claim because item is already marked as {claim.item.status}.",
            )

        claim.status = target_status
        if review_in.reviewNotes:
            claim.review_notes = review_in.reviewNotes.strip()

        # If approved, initialize handover coordination status
        if target_status == "approved":
            claim.handover_status = HandoverStatus.AWAITING_HANDOVER.value

        claim.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(claim)

        # Notify claimant of review outcome
        item_title = claim.item.title if claim.item else "your claimed item"
        if target_status == "approved":
            self.notif_repo.create(
                user_id=claim.claimant_id,
                title="Claim Approved! 🎉",
                message=f"Your claim for '{item_title}' has been approved by the reporter. Return coordination is now open.",
                notification_type="claim_approved",
                item_id=claim.item_id,
                claim_id=claim.id,
            )
        elif target_status == "rejected":
            reason = f": {review_in.reviewNotes}" if review_in.reviewNotes else "."
            self.notif_repo.create(
                user_id=claim.claimant_id,
                title="Claim Rejected",
                message=f"Your claim for '{item_title}' was rejected{reason}",
                notification_type="claim_rejected",
                item_id=claim.item_id,
                claim_id=claim.id,
            )
        elif target_status == "under_review":
            self.notif_repo.create(
                user_id=claim.claimant_id,
                title="Claim Under Review",
                message=f"Your claim for '{item_title}' is being reviewed by the item reporter.",
                notification_type="claim_under_review",
                item_id=claim.item_id,
                claim_id=claim.id,
            )

        return self._to_response(claim, current_user_id=reviewer_id, is_admin=is_admin)

    def update_handover(
        self,
        claim_id: str,
        handover_in: ClaimHandover,
        user_id: str,
        is_admin: bool = False,
    ) -> ClaimResponse:
        """Update return handover arrangement details."""
        claim = self.db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Claim with ID '{claim_id}' not found.",
            )

        is_participant = (
            is_admin
            or (claim.claimant_id == user_id)
            or (claim.item_owner_id == user_id)
        )
        if not is_participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to update handover coordination for this claim.",
            )

        if claim.status.lower() not in ["approved", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Handover arrangements can only be coordinated on approved claims.",
            )

        claim.handover_status = handover_in.handoverStatus
        if handover_in.handoverDetails:
            claim.handover_details = handover_in.handoverDetails.strip()
        claim.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(claim)

        # Notify the counterpart participant
        other_user_id = claim.item_owner_id if user_id == claim.claimant_id else claim.claimant_id
        if other_user_id:
            item_title = claim.item.title if claim.item else "item"
            self.notif_repo.create(
                user_id=other_user_id,
                title="Handover Details Updated",
                message=f"Return handover arrangements for '{item_title}' were updated.",
                notification_type="handover_arranged",
                item_id=claim.item_id,
                claim_id=claim.id,
            )

        return self._to_response(claim, current_user_id=user_id, is_admin=is_admin)

    def complete_return(
        self,
        claim_id: str,
        user_id: str,
        complete_in: Optional[ClaimComplete] = None,
        is_admin: bool = False,
    ) -> ClaimResponse:
        """Confirm that physical handover occurred, marking claim completed and item returned atomically."""
        claim = self.db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Claim with ID '{claim_id}' not found.",
            )

        # 1. Authorization: Only the item reporter or administrator can confirm completion
        is_owner = claim.item_owner_id == user_id or (
            claim.item and claim.item.user_id == user_id
        )
        if not is_owner and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the authorized item reporter or administrator can confirm item return completion.",
            )

        if claim.claimant_id == user_id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Claimants cannot mark their own claims as completed.",
            )

        # 2. Status verification: claim must be approved
        if claim.status.lower() != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only approved claims can be marked as completed.",
            )

        # 3. Perform atomic update in a database transaction
        try:
            claim.status = ClaimStatus.COMPLETED.value
            claim.handover_status = HandoverStatus.RETURNED_SUCCESSFULLY.value
            if complete_in and complete_in.completionNotes:
                existing_notes = claim.review_notes or ""
                claim.review_notes = (
                    f"{existing_notes}\n[Completed]: {complete_in.completionNotes}".strip()
                )
            claim.updated_at = datetime.utcnow()

            # Atomically update item status
            if claim.item:
                claim.item.status = "returned"
                claim.item.updated_at = datetime.utcnow()

            self.db.commit()
            self.db.refresh(claim)
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to complete return transaction: {str(e)}",
            )

        # 4. Notify claimant of successful recovery
        item_title = claim.item.title if claim.item else "your belonging"
        self.notif_repo.create(
            user_id=claim.claimant_id,
            title="Item Returned Successfully! 🎊",
            message=f"Physical return of '{item_title}' has been confirmed! Thank you for using FindIt.",
            notification_type="item_returned",
            item_id=claim.item_id,
            claim_id=claim.id,
        )

        return self._to_response(claim, current_user_id=user_id, is_admin=is_admin)

    def cancel_claim(
        self,
        claim_id: str,
        claimant_id: str,
        is_admin: bool = False,
    ) -> ClaimResponse:
        """Cancel a pending or under-review claim by claimant."""
        claim = self.db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Claim with ID '{claim_id}' not found.",
            )

        if claim.claimant_id != claimant_id and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own submitted claims.",
            )

        if claim.status.lower() not in ["pending", "under_review"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel a claim that is already {claim.status}.",
            )

        claim.status = ClaimStatus.CANCELLED.value
        claim.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(claim)

        # Notify reporter if they were aware
        if claim.item_owner_id:
            item_title = claim.item.title if claim.item else "item"
            self.notif_repo.create(
                user_id=claim.item_owner_id,
                title="Claim Cancelled",
                message=f"A claimant cancelled their claim for '{item_title}'.",
                notification_type="system",
                item_id=claim.item_id,
                claim_id=claim.id,
            )

        return self._to_response(claim, current_user_id=claimant_id, is_admin=is_admin)


def get_claim_repository(db: Session = Depends(get_db)) -> SqlAlchemyClaimRepository:
    """Dependency injector yielding the persistent claim repository."""
    if db is None or isinstance(db, DependsType) or not isinstance(db, Session):
        db = SessionLocal()
    return SqlAlchemyClaimRepository(db)
