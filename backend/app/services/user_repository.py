"""Persistent SQLAlchemy and In-Memory User Repositories."""

import uuid
from datetime import datetime
from typing import Optional, Protocol
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import Depends

from app.db.session import get_db, SessionLocal
from app.models.user import User
from app.schemas.user import UserRegister
from app.core.security import get_password_hash
from app.db.init_db import INITIAL_DEMO_USERS


class UserRepositoryInterface(Protocol):
    """Protocol defining user storage operations."""

    def get_by_id(self, user_id: str) -> Optional[User]:
        ...

    def get_by_email(self, email: str) -> Optional[User]:
        ...

    def get_by_identifier(self, identifier: str) -> Optional[User]:
        ...

    def create(self, user_in: UserRegister, hashed_password: str) -> User:
        ...

    def seed_defaults(self) -> None:
        ...


class SqlAlchemyUserRepository:
    """Persistent SQLAlchemy database repository for User accounts."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: str) -> Optional[User]:
        """Fetch user by persistent identifier."""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch user by normalized lowercase email."""
        return self.db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()

    def get_by_identifier(self, identifier: str) -> Optional[User]:
        """Fetch user by email (case-insensitive), username prefix before '@', or full name."""
        cleaned = identifier.strip().lower()
        if not cleaned:
            return None

        # 1. Exact match on lowercase email
        user = self.db.query(User).filter(func.lower(User.email) == cleaned).first()
        if user:
            return user

        # 2. Match on username prefix before '@' (e.g. 'alex.morgan' -> 'alex.morgan@campus.edu')
        user = self.db.query(User).filter(func.lower(User.email).like(f"{cleaned}@%")).first()
        if user:
            return user

        # 3. Match on full_name (case-insensitive)
        user = self.db.query(User).filter(func.lower(User.full_name) == cleaned).first()
        if user:
            return user

        # 4. Match on first word of full name (e.g. 'Alex' -> 'Alex Morgan')
        user = self.db.query(User).filter(func.lower(User.full_name).like(f"{cleaned} %")).first()
        if user:
            return user

        # 5. Match on last word of full name (e.g. 'Morgan' -> 'Alex Morgan')
        user = self.db.query(User).filter(func.lower(User.full_name).like(f"% {cleaned}")).first()
        if user:
            return user

        # 6. Match on user.id
        return self.db.query(User).filter(User.id == identifier.strip()).first()


    def create(self, user_in: UserRegister, hashed_password: str) -> User:
        """Persist a new user account."""
        now_ts = int(datetime.utcnow().timestamp())
        unique_suffix = uuid.uuid4().hex[:6]
        new_id = f"usr_{now_ts}_{unique_suffix}"

        db_user = User(
            id=new_id,
            email=user_in.email.strip().lower(),
            full_name=user_in.fullName,
            campus=user_in.campus,
            role=user_in.role,
            hashed_password=hashed_password,
            avatar_url=user_in.avatarUrl,
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def update_contact(
        self,
        user_id: str,
        phone_number: Optional[str],
        whatsapp_number: Optional[str],
        whatsapp_same_as_phone: bool,
        preferred_contact_method: str,
    ) -> Optional[User]:
        """Update user contact numbers and preferred contact coordination channel."""
        user = self.get_by_id(user_id)
        if not user:
            return None
        user.phone_number = phone_number
        user.whatsapp_number = whatsapp_number
        user.whatsapp_same_as_phone = whatsapp_same_as_phone
        user.preferred_contact_method = preferred_contact_method
        self.db.commit()
        self.db.refresh(user)
        return user

    def seed_defaults(self) -> None:
        """Reset users table to standard demo user state for test isolation without cascading deletes."""
        for u in INITIAL_DEMO_USERS:
            existing = self.db.query(User).filter(User.id == u["id"]).first()
            if not existing:
                user = User(
                    id=u["id"],
                    email=u["email"],
                    full_name=u["full_name"],
                    campus=u["campus"],
                    role=u["role"],
                    hashed_password=get_password_hash(u["password"]),
                    avatar_url=u.get("avatar_url"),
                )
                self.db.add(user)
            else:
                existing.email = u["email"]
                existing.full_name = u["full_name"]
                existing.campus = u["campus"]
                existing.role = u["role"]
                existing.hashed_password = get_password_hash(u["password"])
                existing.avatar_url = u.get("avatar_url")
        # Remove any non-demo users created during previous tests
        demo_ids = [u["id"] for u in INITIAL_DEMO_USERS]
        self.db.query(User).filter(User.id.notin_(demo_ids)).delete(synchronize_session=False)
        self.db.commit()

    def clear(self) -> None:
        """Remove all users."""
        self.db.query(User).delete()
        self.db.commit()


from fastapi.params import Depends as DependsType


def get_user_repository(db: Session = Depends(get_db)) -> SqlAlchemyUserRepository:
    """Dependency injector providing database-backed user repository."""
    if db is None or isinstance(db, DependsType) or not isinstance(db, Session):
        db = SessionLocal()
    return SqlAlchemyUserRepository(db)
