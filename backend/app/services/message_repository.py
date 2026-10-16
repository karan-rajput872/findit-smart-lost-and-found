"""Persistent SQLAlchemy Message Repository for Return Coordination."""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import desc, or_, and_, func
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.params import Depends as DependsType

from app.db.session import get_db, SessionLocal
from app.models.claim import Claim
from app.models.message import Message
from app.models.user import User
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    ConversationSummary,
)
from app.services.notification_repository import SqlAlchemyNotificationRepository


class SqlAlchemyMessageRepository:
    """Manages chat messages and active conversations between verified claim parties."""

    def __init__(self, db: Session):
        self.db = db
        self.notif_repo = SqlAlchemyNotificationRepository(db)

    def _verify_claim_access(self, claim_id: str, user_id: str) -> Claim:
        """Verify claim exists, is approved/completed, and current user is an authorized participant."""
        claim = self.db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Claim with ID '{claim_id}' not found.",
            )

        if user_id != claim.claimant_id and user_id != claim.item_owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access conversations for this claim.",
            )

        if claim.status.lower() not in ["approved", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Messaging is only available once a claim has been verified and approved.",
            )

        return claim

    def get_claim_messages(self, claim_id: str, user_id: str) -> List[MessageResponse]:
        """Fetch all messages for an approved claim and mark incoming messages as read."""
        claim = self._verify_claim_access(claim_id, user_id)

        # Mark all unread messages addressed to user as read
        unread_msgs = (
            self.db.query(Message)
            .filter(
                Message.claim_id == claim_id,
                Message.recipient_id == user_id,
                Message.is_read.is_(False),
            )
            .all()
        )
        if unread_msgs:
            for m in unread_msgs:
                m.is_read = True
            self.db.commit()

        messages = (
            self.db.query(Message)
            .filter(Message.claim_id == claim_id)
            .order_by(Message.created_at.asc())
            .all()
        )

        results: List[MessageResponse] = []
        for msg in messages:
            sender_name = msg.sender.full_name if msg.sender else "User"
            created_iso = (
                msg.created_at.isoformat()
                if hasattr(msg.created_at, "isoformat")
                else str(msg.created_at)
            )
            if not created_iso.endswith("Z") and "+" not in created_iso:
                created_iso += "Z"

            results.append(
                MessageResponse(
                    id=msg.id,
                    claimId=msg.claim_id,
                    senderId=msg.sender_id,
                    senderName=sender_name,
                    recipientId=msg.recipient_id,
                    content=msg.content,
                    isRead=bool(msg.is_read),
                    createdAt=created_iso,
                )
            )
        return results

    def send_message(
        self,
        claim_id: str,
        sender_id: str,
        message_in: MessageCreate,
    ) -> MessageResponse:
        """Send a message to the counterpart in an approved claim."""
        claim = self._verify_claim_access(claim_id, sender_id)

        recipient_id = (
            claim.item_owner_id if sender_id == claim.claimant_id else claim.claimant_id
        )
        if not recipient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient user account is missing from claim record.",
            )

        now_ts = int(datetime.utcnow().timestamp())
        msg_id = f"msg_{now_ts}_{uuid.uuid4().hex[:6]}"

        message = Message(
            id=msg_id,
            claim_id=claim_id,
            sender_id=sender_id,
            recipient_id=recipient_id,
            content=message_in.content,
            is_read=False,
            created_at=datetime.utcnow(),
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)

        # Notify recipient without exposing message contents or personal numbers
        sender_user = self.db.query(User).filter(User.id == sender_id).first()
        sender_name = sender_user.full_name if sender_user else "A user"
        item_title = claim.item.title if claim.item else "your claimed item"

        self.notif_repo.create(
            user_id=recipient_id,
            title="New Message on FindIt 💬",
            message=f"{sender_name} sent you a message regarding '{item_title}'.",
            notification_type="new_message",
            item_id=claim.item_id,
            claim_id=claim.id,
        )

        created_iso = (
            message.created_at.isoformat()
            if hasattr(message.created_at, "isoformat")
            else str(message.created_at)
        )
        if not created_iso.endswith("Z") and "+" not in created_iso:
            created_iso += "Z"

        return MessageResponse(
            id=message.id,
            claimId=message.claim_id,
            senderId=message.sender_id,
            senderName=sender_name,
            recipientId=message.recipient_id,
            content=message.content,
            isRead=False,
            createdAt=created_iso,
        )

    def list_active_conversations(self, user_id: str) -> List[ConversationSummary]:
        """Fetch summary of all approved or completed claims with messages and unread counts."""
        claims = (
            self.db.query(Claim)
            .filter(
                or_(Claim.claimant_id == user_id, Claim.item_owner_id == user_id),
                Claim.status.in_(["approved", "completed"]),
            )
            .order_by(desc(Claim.updated_at))
            .all()
        )

        conversations: List[ConversationSummary] = []
        for claim in claims:
            # Determine other party
            is_claimant = claim.claimant_id == user_id
            other_user = claim.item_owner if is_claimant else claim.claimant
            other_id = (claim.item_owner_id if is_claimant else claim.claimant_id) or "unknown"
            other_name = other_user.full_name if other_user else "Campus User"
            other_avatar = other_user.avatar_url if other_user else None

            # Get latest message
            last_msg = (
                self.db.query(Message)
                .filter(Message.claim_id == claim.id)
                .order_by(Message.created_at.desc())
                .first()
            )

            last_msg_text = last_msg.content if last_msg else None
            last_msg_time = None
            if last_msg:
                last_msg_time = (
                    last_msg.created_at.isoformat()
                    if hasattr(last_msg.created_at, "isoformat")
                    else str(last_msg.created_at)
                )
                if not last_msg_time.endswith("Z") and "+" not in last_msg_time:
                    last_msg_time += "Z"

            # Count unread messages for user
            unread_count = (
                self.db.query(Message)
                .filter(
                    Message.claim_id == claim.id,
                    Message.recipient_id == user_id,
                    Message.is_read.is_(False),
                )
                .count()
            )

            item_title = claim.item.title if claim.item else "Lost & Found Item"
            item_type = claim.item.type if claim.item else None

            conversations.append(
                ConversationSummary(
                    claimId=claim.id,
                    itemId=claim.item_id,
                    itemTitle=item_title,
                    itemType=item_type,
                    claimStatus=claim.status,
                    otherPartyId=other_id,
                    otherPartyName=other_name,
                    otherPartyAvatar=other_avatar,
                    lastMessage=last_msg_text,
                    lastMessageTime=last_msg_time,
                    unreadCount=unread_count,
                )
            )

        return conversations


def get_message_repository(db: Session = Depends(get_db)) -> SqlAlchemyMessageRepository:
    """Dependency injector yielding the persistent message repository."""
    if db is None or isinstance(db, DependsType) or not isinstance(db, Session):
        db = SessionLocal()
    return SqlAlchemyMessageRepository(db)
