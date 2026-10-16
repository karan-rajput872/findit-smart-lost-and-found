"""Persistent SQLAlchemy Item Repository for Lost & Found Operations."""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Protocol
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from fastapi import Depends
from fastapi.params import Depends as DependsType

from app.db.session import get_db, SessionLocal
from app.models.item import Item
from app.models.user import User
from app.core.security import get_password_hash
from app.schemas.item import (
    ItemCreate,
    ItemUpdate,
    ItemResponse,
    ItemType,
    ItemStatus,
)
from app.db.init_db import INITIAL_DEMO_ITEMS, INITIAL_DEMO_USERS


class ItemRepositoryInterface(Protocol):
    """Abstract interface for lost & found item persistence operations."""

    def list_items(
        self,
        report_type: Optional[ItemType] = None,
        category: Optional[str] = None,
        campus: Optional[str] = None,
        status: Optional[ItemStatus] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[ItemResponse], int]:
        ...

    def list_user_items(
        self,
        user_id: str,
        report_type: Optional[ItemType] = None,
        status: Optional[ItemStatus] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[ItemResponse], int]:
        ...

    def get_stats(self, user_id: Optional[str] = None) -> Dict[str, int]:
        ...

    def get_by_id(self, item_id: str) -> Optional[ItemResponse]:
        ...

    def create(self, item_in: ItemCreate, user_id: Optional[str] = None) -> ItemResponse:
        ...

    def update(self, item_id: str, item_update: ItemUpdate) -> Optional[ItemResponse]:
        ...

    def delete(self, item_id: str) -> bool:
        ...

    def seed_defaults(self) -> None:
        ...


def get_default_item_image(title: str, category: str, item_type: str) -> str:
    combined = f"{title} {category}".lower()
    if any(k in combined for k in ["bottle", "flask", "hydro", "mug", "cup"]):
        return "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["calculator", "graphing", "scientific"]):
        return "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["necklace", "jewelry", "ring", "bracelet", "earring"]):
        return "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["watch", "timepiece", "rolex", "smartwatch"]):
        return "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["key", "fob", "lanyard"]):
        return "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["wallet", "cardholder", "purse", "backpack", "bag"]):
        return "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["headphone", "earbud", "airpod", "headset"]):
        return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["laptop", "macbook", "computer", "ipad", "tablet", "electronic"]):
        return "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80"
    if any(k in combined for k in ["book", "notebook", "textbook", "binder", "folder"]):
        return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80"
    if item_type.lower() == "lost":
        return "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80"
    return "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80"


class SqlAlchemyItemRepository:
    """SQLAlchemy persistent repository managing item listings, search, and aggregates."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def _find_item_entity(self, item_id: str) -> Optional[Item]:
        """Lookup internal Item entity supporting normalized or unprefixed IDs."""
        item = self.db.query(Item).filter(Item.id == item_id).first()
        if not item:
            candidate_prefixed = f"item_{item_id}"
            candidate_unprefixed = item_id.replace("item_", "")
            item = self.db.query(Item).filter(
                or_(
                    Item.id == candidate_prefixed,
                    Item.id == candidate_unprefixed,
                )
            ).first()
        return item

    def list_items(
        self,
        report_type: Optional[ItemType] = None,
        category: Optional[str] = None,
        campus: Optional[str] = None,
        status: Optional[ItemStatus] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[ItemResponse], int]:
        """Filter, search, and paginate items from persistent database."""
        query = self.db.query(Item)

        if report_type:
            query = query.filter(func.lower(Item.type) == report_type.lower())
        if category and category.lower() != "all":
            query = query.filter(func.lower(Item.category) == category.strip().lower())
        if campus and campus.lower() != "all":
            query = query.filter(func.lower(Item.campus) == campus.strip().lower())
        if status and status.lower() != "all":
            query = query.filter(func.lower(Item.status) == status.lower())
        if search_query and search_query.strip():
            term = f"%{search_query.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Item.title).like(term),
                    func.lower(Item.description).like(term),
                    func.lower(Item.location).like(term),
                    func.lower(Item.category).like(term),
                )
            )

        total = query.count()
        entities = (
            query.order_by(Item.date.desc(), Item.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [item.to_response() for item in entities], total

    def list_user_items(
        self,
        user_id: str,
        report_type: Optional[ItemType] = None,
        status: Optional[ItemStatus] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[ItemResponse], int]:
        """Retrieve items created by a specific authenticated user."""
        query = self.db.query(Item).filter(Item.user_id == user_id)

        if report_type:
            query = query.filter(func.lower(Item.type) == report_type.lower())
        if status and status.lower() != "all":
            query = query.filter(func.lower(Item.status) == status.lower())
        if search_query and search_query.strip():
            term = f"%{search_query.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Item.title).like(term),
                    func.lower(Item.description).like(term),
                    func.lower(Item.location).like(term),
                    func.lower(Item.category).like(term),
                )
            )

        total = query.count()
        entities = (
            query.order_by(Item.date.desc(), Item.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return [item.to_response() for item in entities], total

    def get_stats(self, user_id: Optional[str] = None) -> Dict[str, int]:
        """Calculate system and caller-specific listing counts from database."""
        all_items = self.db.query(Item).all()

        total = len(all_items)
        lost = sum(1 for i in all_items if i.type.lower() == "lost")
        found = sum(1 for i in all_items if i.type.lower() == "found")
        open_items = sum(1 for i in all_items if i.status.lower() == "open")

        my_items = [i for i in all_items if user_id and i.user_id == user_id]
        my_total = len(my_items)
        my_lost = sum(1 for i in my_items if i.type.lower() == "lost")
        my_found = sum(1 for i in my_items if i.type.lower() == "found")
        my_open = sum(1 for i in my_items if i.status.lower() == "open")

        return {
            "total_items": total,
            "lost_items": lost,
            "found_items": found,
            "open_items": open_items,
            "my_items_count": my_total,
            "my_lost_count": my_lost,
            "my_found_count": my_found,
            "my_open_count": my_open,
        }

    def get_by_id(self, item_id: str) -> Optional[ItemResponse]:
        """Retrieve single item by identifier."""
        item = self._find_item_entity(item_id)
        return item.to_response() if item else None


    def create(self, item_in: ItemCreate, user_id: Optional[str] = None) -> ItemResponse:
        """Persist a new lost or found item report."""
        now_ts = int(datetime.utcnow().timestamp())
        unique_suffix = uuid.uuid4().hex[:4]
        new_id = f"item_{now_ts}_{unique_suffix}"

        assigned_image = item_in.imageUrl or get_default_item_image(
            item_in.title, item_in.category, item_in.type
        )

        db_item = Item(
            id=new_id,
            user_id=user_id,
            title=item_in.title,
            description=item_in.description,
            category=item_in.category,
            type=item_in.type,
            location=item_in.location,
            campus=item_in.campus,
            date=item_in.date,
            image_url=assigned_image,
            reporter_name=item_in.reporterName or "Campus Reporter",
            reporter_contact=item_in.reporterContact,
            status="open",
            is_demo=True,
        )
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)

        # Trigger automatic AI match evaluation across opposite-type items safely
        try:
            from app.services.match_repository import SqlAlchemyMatchRepository
            match_repo = SqlAlchemyMatchRepository(self.db)
            match_repo.generate_matches_for_item(db_item)
        except Exception as e:
            logger.warning("Automatic match evaluation skipped on item creation: %s", e)

        return db_item.to_response()

    def update(self, item_id: str, item_update: ItemUpdate) -> Optional[ItemResponse]:
        """Update existing item fields and update timestamp."""
        db_item = self._find_item_entity(item_id)
        if not db_item:
            return None

        update_data = item_update.model_dump(exclude_unset=True, by_alias=False)

        # Handle aliases / special fields
        if "imageUrl" in update_data:
            db_item.image_url = update_data.pop("imageUrl")
        elif "image_url" in update_data:
            db_item.image_url = update_data.pop("image_url")

        if "reporterName" in update_data:
            db_item.reporter_name = update_data.pop("reporterName")
        elif "reporter_name" in update_data:
            db_item.reporter_name = update_data.pop("reporter_name")

        if "reporterContact" in update_data:
            db_item.reporter_contact = update_data.pop("reporterContact")
        elif "reporter_contact" in update_data:
            db_item.reporter_contact = update_data.pop("reporter_contact")

        for k, v in update_data.items():
            if v is not None and hasattr(db_item, k):
                setattr(db_item, k, v)

        db_item.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_item)

        try:
            from app.services.match_repository import SqlAlchemyMatchRepository
            match_repo = SqlAlchemyMatchRepository(self.db)
            match_repo.generate_matches_for_item(db_item)
        except Exception as e:
            logger.warning("Automatic match evaluation skipped on item update: %s", e)

        return db_item.to_response()

    def delete(self, item_id: str) -> bool:
        """Remove item from persistent database."""
        db_item = self._find_item_entity(item_id)
        if not db_item:
            return False

        self.db.delete(db_item)
        self.db.commit()
        return True

    def seed_defaults(self) -> None:
        """Reset items table to standard demo items for test isolation."""
        # Ensure referenced demo users exist to fulfill foreign key constraints
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
        self.db.commit()

        self.db.query(Item).delete()
        self.db.commit()

        for raw in INITIAL_DEMO_ITEMS:
            item = Item(
                id=raw["id"],
                user_id=raw.get("user_id"),
                type=raw["type"],
                title=raw["title"],
                category=raw["category"],
                description=raw["description"],
                date=raw["date"],
                location=raw["location"],
                campus=raw["campus"],
                image_url=raw.get("image_url"),
                status=raw.get("status", "open"),
                reporter_name=raw.get("reporter_name", "Campus Member"),
                reporter_contact=raw.get("reporter_contact"),
                is_demo=True,
            )
            self.db.add(item)
        self.db.commit()

    def clear(self) -> None:
        """Clear all items."""
        self.db.query(Item).delete()
        self.db.commit()


def get_item_repository(db: Session = Depends(get_db)) -> SqlAlchemyItemRepository:
    """Dependency injector yielding the persistent database item repository."""
    if db is None or isinstance(db, DependsType) or not isinstance(db, Session):
        db = SessionLocal()
    return SqlAlchemyItemRepository(db)
