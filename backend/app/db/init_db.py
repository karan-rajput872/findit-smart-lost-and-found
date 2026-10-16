"""Database initialization, table creation, and initial seed procedures."""

import logging
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import engine, SessionLocal, check_db_connection
from app.models.user import User
from app.models.item import Item

logger = logging.getLogger("findit.db")


INITIAL_DEMO_USERS = [
    {
        "id": "usr_demo_01",
        "email": "alex.morgan@campus.edu",
        "full_name": "Alex Morgan",
        "campus": "Central Campus",
        "role": "student",
        "password": "CampusPass123!",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
    },
    {
        "id": "usr_demo_02",
        "email": "elena.r@campus.edu",
        "full_name": "Elena Rostova",
        "campus": "Central Campus",
        "role": "student",
        "password": "ElenaPass123!",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    },
    {
        "id": "usr_staff_01",
        "email": "library-help@campus.edu",
        "full_name": "Library Staff (Desk #1)",
        "campus": "Central Campus",
        "role": "staff",
        "password": "StaffPass123!",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    },
    {
        "id": "usr_staff_02",
        "email": "security@campus.edu",
        "full_name": "Security Guard Marcus",
        "campus": "Central Campus",
        "role": "staff",
        "password": "StaffPass123!",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    },
]

INITIAL_DEMO_ITEMS = [
    {
        "id": "item_101",
        "user_id": "usr_demo_01",
        "type": "lost",
        "title": "Midnight Blue Bellroy Leather Wallet",
        "category": "Wallets & Bags",
        "description": "Bifold slim navy leather wallet with a red interior accent. Contains student ID card and bus transit pass.",
        "date": "2026-10-10",
        "location": "Central Library, 3rd Floor Study Pods",
        "campus": "Central Campus",
        "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80",
        "status": "open",
        "reporter_name": "Alex Morgan",
        "reporter_contact": "alex.morgan@campus.edu",
        "is_demo": True,
    },
    {
        "id": "item_102",
        "user_id": "usr_staff_01",
        "type": "found",
        "title": "Navy Leather Slim Cardholder / Wallet",
        "category": "Wallets & Bags",
        "description": "Found under desk 34 in Central Library quiet zone. Handed over to 1st floor front desk supervisor.",
        "date": "2026-10-10",
        "location": "Central Library, Information Desk",
        "campus": "Central Campus",
        "image_url": "https://images.unsplash.com/photo-1606503825008-909a67e63c23?auto=format&fit=crop&w=800&q=80",
        "status": "open",
        "reporter_name": "Library Staff (Desk #1)",
        "reporter_contact": "library-help@campus.edu",
        "is_demo": True,
    },
    {
        "id": "item_103",
        "user_id": "usr_demo_02",
        "type": "lost",
        "title": "Sony WH-1000XM5 Noise Canceling Headphones",
        "category": "Electronics",
        "description": "Silver/Platinum case containing black wireless headphones. Left near charging hub.",
        "date": "2026-10-09",
        "location": "Student Union Hall, Booth 12",
        "campus": "Central Campus",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        "status": "open",
        "reporter_name": "Elena Rostova",
        "reporter_contact": "elena.r@campus.edu",
        "is_demo": True,
    },
    {
        "id": "item_104",
        "user_id": "usr_staff_02",
        "type": "found",
        "title": "Sony Wireless Headphones in Grey Case",
        "category": "Electronics",
        "description": "Black over-ear headphones found during evening cleanup.",
        "date": "2026-10-09",
        "location": "Student Union Hall, Info Hub",
        "campus": "Central Campus",
        "image_url": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
        "status": "open",
        "reporter_name": "Security Guard Marcus",
        "reporter_contact": "security@campus.edu",
        "is_demo": True,
    },
    {
        "id": "item_105",
        "user_id": "usr_demo_01",
        "type": "lost",
        "title": "Subaru Car Key with KIIT Lanyard",
        "category": "Keys",
        "description": "Key fob with blue silicone bumper and black engraved campus lanyard.",
        "date": "2026-10-11",
        "location": "North Parking Garage B, Level 2",
        "campus": "North Engineering Campus",
        "image_url": "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80",
        "status": "open",
        "reporter_name": "Alex Morgan",
        "reporter_contact": "alex.morgan@campus.edu",
        "is_demo": True,
    },
    {
        "id": "item_106",
        "user_id": "usr_staff_01",
        "type": "found",
        "title": "Titanium Hydro Flask Water Bottle",
        "category": "Other",
        "description": "32oz stainless insulated bottle with outdoor brand stickers.",
        "date": "2026-10-12",
        "location": "Engineering Lab 204",
        "campus": "North Engineering Campus",
        "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
        "status": "open",
        "reporter_name": "Lab Assistant Priya",
        "reporter_contact": "priya.k@campus.edu",
        "is_demo": True,
    },
]


def seed_database_if_empty(db: Session) -> None:
    """Populate default demo users and items only when tables are empty."""
    if db.query(User).first() is None:
        logger.info("Database users table is empty. Seeding initial demo accounts...")
        for u in INITIAL_DEMO_USERS:
            user = User(
                id=u["id"],
                email=u["email"],
                full_name=u["full_name"],
                campus=u["campus"],
                role=u["role"],
                hashed_password=get_password_hash(u["password"]),
                avatar_url=u.get("avatar_url"),
            )
            db.add(user)
        db.commit()

    if db.query(Item).first() is None:
        logger.info("Database items table is empty. Seeding initial demo listings...")
        for item_data in INITIAL_DEMO_ITEMS:
            item = Item(
                id=item_data["id"],
                user_id=item_data["user_id"],
                type=item_data["type"],
                title=item_data["title"],
                category=item_data["category"],
                description=item_data["description"],
                date=item_data["date"],
                location=item_data["location"],
                campus=item_data["campus"],
                image_url=item_data.get("image_url"),
                status=item_data.get("status", "open"),
                reporter_name=item_data.get("reporter_name"),
                reporter_contact=item_data.get("reporter_contact"),
                is_demo=item_data.get("is_demo", True),
            )
            db.add(item)
        db.commit()

    from app.models.match import ItemMatch
    from app.services.match_repository import SqlAlchemyMatchRepository
    if db.query(ItemMatch).first() is None:
        logger.info("Generating initial AI match recommendations for demo items...")
        match_repo = SqlAlchemyMatchRepository(db)
        match_repo.generate_all_matches()


def run_safe_schema_migrations(engine_instance) -> None:
    """Safely apply non-destructive schema migrations (e.g. new columns) on SQLite tables."""
    if not settings.is_sqlite:
        return

    try:
        with engine_instance.connect() as conn:
            # Check users table columns
            user_cols_res = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
            user_cols = [row[1] for row in user_cols_res] if user_cols_res else []
            if user_cols:
                if "phone_number" not in user_cols:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN phone_number VARCHAR(30)")
                if "whatsapp_number" not in user_cols:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN whatsapp_number VARCHAR(30)")
                if "whatsapp_same_as_phone" not in user_cols:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN whatsapp_same_as_phone BOOLEAN DEFAULT 1")
                if "preferred_contact_method" not in user_cols:
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN preferred_contact_method VARCHAR(30) DEFAULT 'findit_chat'")

            # Check claims table columns
            claim_cols_res = conn.exec_driver_sql("PRAGMA table_info(claims)").fetchall()
            claim_cols = [row[1] for row in claim_cols_res] if claim_cols_res else []
            if claim_cols:
                if "claimant_contact_shared" not in claim_cols:
                    conn.exec_driver_sql("ALTER TABLE claims ADD COLUMN claimant_contact_shared BOOLEAN DEFAULT 0")
                if "owner_contact_shared" not in claim_cols:
                    conn.exec_driver_sql("ALTER TABLE claims ADD COLUMN owner_contact_shared BOOLEAN DEFAULT 0")

            conn.commit()
    except Exception as e:
        logger.warning("Non-fatal schema migration note: %s", e)


def init_db() -> bool:
    """Initialize database connection, ensure schema exists, and seed if empty."""
    is_connected, msg = check_db_connection()
    if not is_connected:
        logger.error("Failed to connect to database during startup: %s", msg)
        return False

    try:
        # Create all tables (including newly added Message table)
        Base.metadata.create_all(bind=engine)

        # Run safe migrations for existing tables
        run_safe_schema_migrations(engine)

        # Seed initial records if table is fresh
        db = SessionLocal()
        try:
            seed_database_if_empty(db)
        finally:
            db.close()

        logger.info(
            "Persistent database initialized successfully. Active storage mode: %s",
            settings.active_storage_mode,
        )
        return True
    except Exception as e:
        logger.error("Error initializing database schema or seed data: %s", e, exc_info=True)
        return False
