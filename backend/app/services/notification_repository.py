"""Persistent SQLAlchemy Notification Repository for In-App User Alerts."""

import uuid
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from fastapi import Depends
from fastapi.params import Depends as DependsType

from app.db.session import get_db, SessionLocal
from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationResponse


class SqlAlchemyNotificationRepository:
    """Manages persistent notification storage and user queries."""

    def __init__(self, db: Session):
        self.db = db

    def _to_response(self, notif: Notification) -> NotificationResponse:
        """Serialize database model to safe client response schema."""
        created_iso = (
            notif.created_at.isoformat()
            if hasattr(notif.created_at, "isoformat")
            else str(notif.created_at)
        )
        if not created_iso.endswith("Z") and "+" not in created_iso:
            created_iso += "Z"

        # Determine route link based on notification context
        link = "/dashboard/notifications"
        if notif.notification_type == "match_found":
            link = "/dashboard/ai-matches"
        elif notif.claim_id:
            link = f"/dashboard/my-claims"
        elif notif.item_id:
            link = f"/dashboard/items/{notif.item_id}"

        return NotificationResponse(
            id=notif.id,
            userId=notif.user_id,
            title=notif.title,
            message=notif.message,
            notificationType=notif.notification_type,
            itemId=notif.item_id,
            claimId=notif.claim_id,
            isRead=notif.is_read,
            createdAt=created_iso,
            link=link,
        )

    def create(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "system",
        item_id: Optional[str] = None,
        claim_id: Optional[str] = None,
    ) -> NotificationResponse:
        """Create and persist an in-app notification alert."""
        notif_id = f"notif_{uuid.uuid4().hex[:12]}"
        notif = Notification(
            id=notif_id,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            item_id=item_id,
            claim_id=claim_id,
            is_read=False,
            created_at=datetime.utcnow(),
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return self._to_response(notif)

    def list_user_notifications(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[NotificationResponse], int, int]:
        """Fetch paginated notifications for the specified user along with total and unread count."""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        total = query.count()
        unread_count = query.filter(Notification.is_read.is_(False)).count()

        records = (
            query.order_by(desc(Notification.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [self._to_response(r) for r in records], total, unread_count

    def get_unread_count(self, user_id: str) -> int:
        """Get the number of unread alerts for the user."""
        return (
            self.db.query(func.count(Notification.id))
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .scalar()
            or 0
        )

    def mark_as_read(self, notification_id: str, user_id: str) -> Optional[NotificationResponse]:
        """Mark a single notification as read if owned by the requesting user."""
        notif = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if not notif:
            return None
        notif.is_read = True
        self.db.commit()
        self.db.refresh(notif)
        return self._to_response(notif)

    def mark_all_as_read(self, user_id: str) -> int:
        """Mark all unread notifications for a user as read."""
        updated = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
            .update({"is_read": True}, synchronize_session="fetch")
        )
        self.db.commit()
        return updated

    def delete(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification owned by the requesting user."""
        notif = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if not notif:
            return False
        self.db.delete(notif)
        self.db.commit()
        return True


def get_notification_repository(db: Session = Depends(get_db)) -> SqlAlchemyNotificationRepository:
    """Dependency injector yielding the persistent notification repository."""
    if db is None or isinstance(db, DependsType) or not isinstance(db, Session):
        db = SessionLocal()
    return SqlAlchemyNotificationRepository(db)
