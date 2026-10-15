"""Persistent SQLAlchemy Match Repository for AI Recommendations."""

import json
import logging
import uuid
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy import desc, func, or_, and_
from sqlalchemy.orm import Session
from fastapi import Depends

from app.db.session import get_db
from app.models.item import Item
from app.models.match import ItemMatch, MatchStatus, MatchFeedback
from app.models.notification import Notification, NotificationType
from app.schemas.item import ItemResponse
from app.schemas.match import (
    MatchResponse,
    MatchListResponse,
    MatchGenerateResponse,
)
from app.services.matching_engine import MatchingEngine
from app.services.notification_repository import SqlAlchemyNotificationRepository

logger = logging.getLogger("findit.matches")


class SqlAlchemyMatchRepository:
    """Manages AI match pairing evaluation, storage, queries, and feedback."""

    def __init__(self, db: Session):
        self.db = db
        self.notif_repo = SqlAlchemyNotificationRepository(db)

    def _item_to_response(self, item: Item) -> ItemResponse:
        """Serialize Item model into ItemResponse schema."""
        created_iso = (
            item.created_at.isoformat()
            if hasattr(item.created_at, "isoformat")
            else str(item.created_at)
        )
        if not created_iso.endswith("Z") and "+" not in created_iso:
            created_iso += "Z"

        return ItemResponse(
            id=item.id,
            userId=item.user_id,
            title=item.title,
            description=item.description,
            category=item.category,
            type=item.type,
            location=item.location,
            campus=item.campus,
            date=item.date,
            imageUrl=item.image_url,
            status=item.status,
            reporterName=item.reporter_name,
            reporterContact=item.reporter_contact,
            createdAt=created_iso,
            claimCount=getattr(item, "claim_count", 0),
        )

    def _to_response(self, match: ItemMatch) -> MatchResponse:
        """Convert database ItemMatch model to safe Pydantic response."""
        created_iso = (
            match.created_at.isoformat()
            if hasattr(match.created_at, "isoformat")
            else str(match.created_at)
        )
        if not created_iso.endswith("Z") and "+" not in created_iso:
            created_iso += "Z"

        reasons = []
        if match.reasons_json:
            try:
                reasons = json.loads(match.reasons_json)
            except Exception:
                reasons = []

        lost_resp = self._item_to_response(match.lost_item) if match.lost_item else None
        found_resp = self._item_to_response(match.found_item) if match.found_item else None

        return MatchResponse(
            id=match.id,
            lostItemId=match.lost_item_id,
            foundItemId=match.found_item_id,
            lostUserId=match.lost_user_id,
            foundUserId=match.found_user_id,
            overallScore=match.overall_score,
            confidenceTier=match.confidence_tier,
            titleScore=match.title_score,
            semanticScore=match.semantic_score,
            attributeScore=match.attribute_score,
            locationScore=match.location_score,
            dateScore=match.date_score,
            imageScore=match.image_score,
            explanation=match.explanation,
            reasons=reasons,
            status=match.status,
            feedback=match.feedback,
            feedbackNotes=match.feedback_notes,
            createdAt=created_iso,
            lostItem=lost_resp,
            foundItem=found_resp,
        )

    def evaluate_and_upsert_pair(
        self,
        lost_item: Item,
        found_item: Item,
        send_notifications: bool = True,
    ) -> Optional[ItemMatch]:
        """Evaluate two items, calculate multi-signal score, and persist if relevant."""
        if lost_item.type != "lost" or found_item.type != "found":
            return None

        # Exclude completed/returned items from active matching
        if lost_item.status == "returned" or found_item.status == "returned":
            return None

        # Convert to dictionary for engine
        lost_dict = {
            "title": lost_item.title,
            "description": lost_item.description,
            "category": lost_item.category,
            "location": lost_item.location,
            "campus": lost_item.campus,
            "date": lost_item.date,
            "image_url": lost_item.image_url,
        }
        found_dict = {
            "title": found_item.title,
            "description": found_item.description,
            "category": found_item.category,
            "location": found_item.location,
            "campus": found_item.campus,
            "date": found_item.date,
            "image_url": found_item.image_url,
        }

        eval_result = MatchingEngine.evaluate_match(lost_dict, found_dict)
        overall_score = eval_result["overall_score"]

        # Only store matches with a baseline relevance score >= 20
        if overall_score < 20:
            return None

        # Check existing match
        match = (
            self.db.query(ItemMatch)
            .filter(
                ItemMatch.lost_item_id == lost_item.id,
                ItemMatch.found_item_id == found_item.id,
            )
            .first()
        )

        is_new = False
        if not match:
            is_new = True
            match_id = f"match_{uuid.uuid4().hex[:12]}"
            match = ItemMatch(
                id=match_id,
                lost_item_id=lost_item.id,
                found_item_id=found_item.id,
                lost_user_id=lost_item.user_id,
                found_user_id=found_item.user_id,
                overall_score=overall_score,
                confidence_tier=eval_result["confidence_tier"],
                title_score=eval_result["title_score"],
                semantic_score=eval_result["semantic_score"],
                attribute_score=eval_result["attribute_score"],
                location_score=eval_result["location_score"],
                date_score=eval_result["date_score"],
                image_score=eval_result["image_score"],
                explanation=eval_result["explanation"],
                reasons_json=json.dumps(eval_result["reasons"]),
                status=MatchStatus.SUGGESTED.value,
            )
            self.db.add(match)
        else:
            # Update existing match with fresh scores
            match.overall_score = overall_score
            match.confidence_tier = eval_result["confidence_tier"]
            match.title_score = eval_result["title_score"]
            match.semantic_score = eval_result["semantic_score"]
            match.attribute_score = eval_result["attribute_score"]
            match.location_score = eval_result["location_score"]
            match.date_score = eval_result["date_score"]
            match.image_score = eval_result["image_score"]
            match.explanation = eval_result["explanation"]
            match.reasons_json = json.dumps(eval_result["reasons"])
            match.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(match)

        # Send alert if confidence is high (score >= 70) and is new
        if send_notifications and is_new and overall_score >= 70:
            self._notify_high_confidence_match(match, lost_item, found_item)

        return match

    def _notify_high_confidence_match(
        self,
        match: ItemMatch,
        lost_item: Item,
        found_item: Item,
    ) -> None:
        """Send smart in-app match alerts to the lost item owner and found item reporter."""
        try:
            # 1. Notify lost item owner
            owner_msg = (
                f"We found a potential {match.overall_score}% match for your lost '{lost_item.title}': "
                f"'{found_item.title}' was turned in at {found_item.location}."
            )
            self.notif_repo.create(
                user_id=lost_item.user_id,
                title=f"Potential Match Detected ({match.overall_score}%)",
                message=owner_msg,
                notification_type=NotificationType.MATCH_FOUND.value,
                item_id=found_item.id,
            )

            # 2. Notify found item reporter if different user
            if found_item.user_id != lost_item.user_id:
                finder_msg = (
                    f"Your reported found item '{found_item.title}' matches a lost report for "
                    f"'{lost_item.title}' ({match.overall_score}% similarity)."
                )
                self.notif_repo.create(
                    user_id=found_item.user_id,
                    title=f"Potential Match for Turned-in Item ({match.overall_score}%)",
                    message=finder_msg,
                    notification_type=NotificationType.MATCH_FOUND.value,
                    item_id=lost_item.id,
                )
        except Exception as e:
            logger.warning("Failed to dispatch match notification: %s", e)

    def generate_matches_for_item(self, item: Item) -> Tuple[int, int]:
        """Evaluate a single item against all opposite-type active items."""
        generated = 0
        updated = 0

        if item.type == "lost":
            candidates = (
                self.db.query(Item)
                .filter(
                    Item.type == "found",
                    Item.status != "returned",
                )
                .all()
            )
            for cand in candidates:
                existing = (
                    self.db.query(ItemMatch)
                    .filter(
                        ItemMatch.lost_item_id == item.id,
                        ItemMatch.found_item_id == cand.id,
                    )
                    .first()
                )
                res = self.evaluate_and_upsert_pair(item, cand)
                if res:
                    if existing:
                        updated += 1
                    else:
                        generated += 1
        elif item.type == "found":
            candidates = (
                self.db.query(Item)
                .filter(
                    Item.type == "lost",
                    Item.status != "returned",
                )
                .all()
            )
            for cand in candidates:
                existing = (
                    self.db.query(ItemMatch)
                    .filter(
                        ItemMatch.lost_item_id == cand.id,
                        ItemMatch.found_item_id == item.id,
                    )
                    .first()
                )
                res = self.evaluate_and_upsert_pair(cand, item)
                if res:
                    if existing:
                        updated += 1
                    else:
                        generated += 1

        return generated, updated

    def generate_all_matches(self) -> Tuple[int, int, int]:
        """Evaluate all active lost items against all active found items."""
        lost_items = (
            self.db.query(Item)
            .filter(
                Item.type == "lost",
                Item.status != "returned",
            )
            .all()
        )
        found_items = (
            self.db.query(Item)
            .filter(
                Item.type == "found",
                Item.status != "returned",
            )
            .all()
        )

        total_evaluated = len(lost_items) * len(found_items)
        generated = 0
        updated = 0

        for lost in lost_items:
            for found in found_items:
                existing = (
                    self.db.query(ItemMatch)
                    .filter(
                        ItemMatch.lost_item_id == lost.id,
                        ItemMatch.found_item_id == found.id,
                    )
                    .first()
                )
                res = self.evaluate_and_upsert_pair(lost, found, send_notifications=False)
                if res:
                    if existing:
                        updated += 1
                    else:
                        generated += 1

        return generated, updated, total_evaluated

    def get_matches(
        self,
        user_id: str,
        is_admin: bool = False,
        tier: Optional[str] = None,
        min_score: Optional[int] = None,
        category: Optional[str] = None,
        feedback: Optional[str] = None,
        item_id: Optional[str] = None,
        lost_item_id: Optional[str] = None,
        found_item_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> MatchListResponse:
        """Query user's authorized matches with optional filtering and aggregates."""
        query = self.db.query(ItemMatch)

        # Authorization: regular users see matches involving their own lost or found items
        if not is_admin:
            query = query.filter(
                or_(
                    ItemMatch.lost_user_id == user_id,
                    ItemMatch.found_user_id == user_id,
                )
            )

        # Filters
        if tier:
            query = query.filter(ItemMatch.confidence_tier == tier.lower())
        if min_score is not None:
            query = query.filter(ItemMatch.overall_score >= min_score)
        if feedback:
            query = query.filter(ItemMatch.feedback == feedback.lower())
        if item_id:
            query = query.filter(
                or_(
                    ItemMatch.lost_item_id == item_id,
                    ItemMatch.found_item_id == item_id,
                )
            )
        if lost_item_id:
            query = query.filter(ItemMatch.lost_item_id == lost_item_id)
        if found_item_id:
            query = query.filter(ItemMatch.found_item_id == found_item_id)

        # Join item if category filter is requested
        if category:
            query = query.join(Item, ItemMatch.lost_item_id == Item.id).filter(
                Item.category.ilike(f"%{category}%")
            )

        # Aggregate counts
        base_user_filter = (
            or_(
                ItemMatch.lost_user_id == user_id,
                ItemMatch.found_user_id == user_id,
            )
            if not is_admin
            else True
        )
        counts_query = self.db.query(
            ItemMatch.confidence_tier,
            func.count(ItemMatch.id),
        ).filter(base_user_filter).group_by(ItemMatch.confidence_tier).all()

        counts_dict = {t: c for t, c in counts_query}
        strong_count = counts_dict.get("strong", 0)
        possible_count = counts_dict.get("possible", 0)
        weak_count = counts_dict.get("weak", 0)

        total = query.count()
        matches = (
            query.order_by(desc(ItemMatch.overall_score), desc(ItemMatch.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        return MatchListResponse(
            matches=[self._to_response(m) for m in matches],
            total=total,
            strongCount=strong_count,
            possibleCount=possible_count,
            weakCount=weak_count,
        )

    def get_match_by_id(
        self,
        match_id: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Optional[MatchResponse]:
        """Fetch single match with authorization check."""
        match = self.db.query(ItemMatch).filter(ItemMatch.id == match_id).first()
        if not match:
            return None

        # Check authorization
        if not is_admin and match.lost_user_id != user_id and match.found_user_id != user_id:
            return None

        return self._to_response(match)

    def record_feedback(
        self,
        match_id: str,
        feedback: str,
        notes: Optional[str],
        user_id: str,
        is_admin: bool = False,
    ) -> Optional[MatchResponse]:
        """Record user relevance feedback on an AI match recommendation."""
        match = self.db.query(ItemMatch).filter(ItemMatch.id == match_id).first()
        if not match:
            return None

        if not is_admin and match.lost_user_id != user_id and match.found_user_id != user_id:
            return None

        match.feedback = feedback
        match.feedback_notes = notes
        match.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(match)
        return self._to_response(match)

    def update_status(
        self,
        match_id: str,
        status: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Optional[MatchResponse]:
        """Update match review status (e.g. dismissed, viewed, claimed)."""
        match = self.db.query(ItemMatch).filter(ItemMatch.id == match_id).first()
        if not match:
            return None

        if not is_admin and match.lost_user_id != user_id and match.found_user_id != user_id:
            return None

        match.status = status
        match.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(match)
        return self._to_response(match)


def get_match_repository(
    db: Session = Depends(get_db),
) -> SqlAlchemyMatchRepository:
    """FastAPI dependency for SqlAlchemyMatchRepository."""
    return SqlAlchemyMatchRepository(db)
