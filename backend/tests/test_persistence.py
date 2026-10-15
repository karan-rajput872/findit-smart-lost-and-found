"""Automated verification tests proving SQLite database persistence.

Requirements:
A. User persistence:
   Register a user. Verify storage in database. Close session. Open new session. Verify user persists.
B. Item persistence:
   Create user and lost item. Close session. Open new session. Verify item persists.
C. Authentication:
   Register user. Log in. Retrieve protected profile. Verify JWT authentication works with persistent DB.
D. Ownership:
   Create two users. Create reports. Verify unauthorized modification/deletion is rejected with 403.
E. Restart persistence:
   Write test data. Dispose of database connection engine. Reinitialize database. Verify data survives.
"""

import uuid
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.db.session import engine, SessionLocal
from app.models.user import User
from app.models.item import Item
from app.core.security import get_password_hash, create_access_token


def test_user_persistence_across_sessions() -> None:
    """Test A: Verify user persists across separate database sessions."""
    unique_suffix = uuid.uuid4().hex[:8]
    user_id = f"usr_persist_{unique_suffix}"
    email = f"persist_{unique_suffix}@campus.edu"

    # Session 1: Create user and commit
    session1: Session = SessionLocal()
    try:
        new_user = User(
            id=user_id,
            email=email,
            full_name="Persistence Test User",
            campus="Central Campus",
            role="student",
            hashed_password=get_password_hash("Password123!"),
            avatar_url="https://example.com/avatar.jpg",
        )
        session1.add(new_user)
        session1.commit()
    finally:
        session1.close()

    # Session 2: Open entirely new session and query user
    session2: Session = SessionLocal()
    try:
        retrieved = session2.query(User).filter(User.id == user_id).first()
        assert retrieved is not None
        assert retrieved.id == user_id
        assert retrieved.email == email
        assert retrieved.full_name == "Persistence Test User"
        assert retrieved.campus == "Central Campus"
        assert retrieved.role == "student"
        assert retrieved.avatar_url == "https://example.com/avatar.jpg"
    finally:
        # Cleanup
        if retrieved:
            session2.delete(retrieved)
            session2.commit()
        session2.close()


def test_item_persistence_across_sessions() -> None:
    """Test B: Verify item persists across separate database sessions."""
    unique_suffix = uuid.uuid4().hex[:8]
    user_id = f"usr_item_persist_{unique_suffix}"
    item_id = f"item_persist_{unique_suffix}"

    # Session 1: Create user and associated item
    session1: Session = SessionLocal()
    try:
        owner = User(
            id=user_id,
            email=f"owner_{unique_suffix}@campus.edu",
            full_name="Item Owner User",
            campus="Central Campus",
            role="student",
            hashed_password=get_password_hash("OwnerPassword123!"),
        )
        session1.add(owner)
        session1.commit()

        lost_item = Item(
            id=item_id,
            user_id=user_id,
            title="Graphing Calculator TI-84",
            description="Black Texas Instruments calculator in rubberized cover.",
            category="Electronics",
            type="lost",
            location="Math Building Rm 302",
            campus="Central Campus",
            date="2026-10-14",
            image_url="https://example.com/ti84.jpg",
            reporter_name="Item Owner User",
            reporter_contact="owner@campus.edu",
            status="open",
            is_demo=False,
        )
        session1.add(lost_item)
        session1.commit()
    finally:
        session1.close()

    # Session 2: Open independent session and verify item fields
    session2: Session = SessionLocal()
    try:
        retrieved_item = session2.query(Item).filter(Item.id == item_id).first()
        assert retrieved_item is not None
        assert retrieved_item.id == item_id
        assert retrieved_item.user_id == user_id
        assert retrieved_item.title == "Graphing Calculator TI-84"
        assert retrieved_item.type == "lost"
        assert retrieved_item.category == "Electronics"
        assert retrieved_item.status == "open"
        assert retrieved_item.location == "Math Building Rm 302"
    finally:
        # Cleanup
        if retrieved_item:
            session2.delete(retrieved_item)
        owner_entity = session2.query(User).filter(User.id == user_id).first()
        if owner_entity:
            session2.delete(owner_entity)
        session2.commit()
        session2.close()


def test_authentication_and_jwt_profile(client: TestClient) -> None:
    """Test C: Register, authenticate, and retrieve protected profile via persistent storage."""
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"auth_persist_{unique_suffix}@campus.edu"
    password = "AuthPassword2026!"

    # 1. Register new account
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "fullName": "Auth Persistence User",
            "password": password,
            "confirmPassword": password,
            "campus": "Central Campus",
            "role": "student",
        },
    )
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    user_id = user_data["id"]

    # 2. Authenticate
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    token = login_data["access_token"]
    assert token

    # 3. Retrieve protected profile
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    profile = me_resp.json()
    assert profile["id"] == user_id
    assert profile["email"] == email
    assert profile["fullName"] == "Auth Persistence User"


def test_ownership_enforcement(client: TestClient) -> None:
    """Test D: Verify ownership security - user B cannot modify or delete user A's listings."""
    unique_suffix = uuid.uuid4().hex[:8]

    # User A token
    token_a = create_access_token(subject="usr_demo_01")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User B token
    token_b = create_access_token(subject="usr_demo_02")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a report
    create_resp = client.post(
        "/api/v1/items",
        json={
            "title": f"Owner Protected Backpack {unique_suffix}",
            "description": "Black Osprey commuter backpack with laptop compartment.",
            "category": "Wallets & Bags",
            "type": "lost",
            "location": "Cafeteria Terrace",
            "campus": "Central Campus",
            "date": "2026-10-14",
        },
        headers=headers_a,
    )
    assert create_resp.status_code == 201
    created_item = create_resp.json()
    item_id = created_item["id"]

    try:
        # User B attempts to modify item -> 403 Forbidden
        patch_resp = client.patch(
            f"/api/v1/items/{item_id}",
            json={"title": "Unauthorized Modification Attempt"},
            headers=headers_b,
        )
        assert patch_resp.status_code == 403

        # User B attempts to delete item -> 403 Forbidden
        del_unauthorized = client.delete(f"/api/v1/items/{item_id}", headers=headers_b)
        assert del_unauthorized.status_code == 403

        # User A successfully updates item
        patch_owner = client.patch(
            f"/api/v1/items/{item_id}",
            json={"status": "resolved"},
            headers=headers_a,
        )
        assert patch_owner.status_code == 200
        assert patch_owner.json()["status"] == "resolved"

        # User A successfully deletes item
        del_owner = client.delete(f"/api/v1/items/{item_id}", headers=headers_a)
        assert del_owner.status_code == 204
    finally:
        # Cleanup safety
        session = SessionLocal()
        it = session.query(Item).filter(Item.id == item_id).first()
        if it:
            session.delete(it)
            session.commit()
        session.close()


def test_restart_persistence() -> None:
    """Test E: Verify stored records survive database engine disposal and re-initialization."""
    unique_suffix = uuid.uuid4().hex[:8]
    user_id = f"usr_restart_{unique_suffix}"
    item_id = f"item_restart_{unique_suffix}"

    # 1. Write initial records
    session = SessionLocal()
    try:
        restart_user = User(
            id=user_id,
            email=f"restart_{unique_suffix}@campus.edu",
            full_name="Restart Test User",
            campus="Central Campus",
            role="student",
            hashed_password=get_password_hash("RestartPass123!"),
        )
        session.add(restart_user)
        session.commit()

        restart_item = Item(
            id=item_id,
            user_id=user_id,
            title=f"Restart Surviving Keyring {unique_suffix}",
            description="Brass key with red bicycle tag.",
            category="Keys",
            type="found",
            location="East Bike Rack #4",
            campus="Central Campus",
            date="2026-10-14",
            status="open",
            is_demo=False,
        )
        session.add(restart_item)
        session.commit()
    finally:
        session.close()

    # 2. Simulate complete backend restart by disposing existing engine connection pool
    engine.dispose()

    # 3. Re-open brand new database session after disposal
    new_session = SessionLocal()
    try:
        reloaded_user = new_session.query(User).filter(User.id == user_id).first()
        assert reloaded_user is not None
        assert reloaded_user.id == user_id
        assert reloaded_user.full_name == "Restart Test User"

        reloaded_item = new_session.query(Item).filter(Item.id == item_id).first()
        assert reloaded_item is not None
        assert reloaded_item.id == item_id
        assert reloaded_item.title == f"Restart Surviving Keyring {unique_suffix}"
        assert reloaded_item.user_id == user_id
        assert reloaded_item.status == "open"
    finally:
        # Cleanup
        if reloaded_item:
            new_session.delete(reloaded_item)
        if reloaded_user:
            new_session.delete(reloaded_user)
        new_session.commit()
        new_session.close()
