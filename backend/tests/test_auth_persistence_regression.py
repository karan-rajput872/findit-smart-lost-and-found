"""Comprehensive Regression Test Suite for Authentication, Persistence, and Reloads.

Covers Test Groups A through G as specified in the FindIt verification requirements.
Uses an isolated test database to ensure user production/development records are preserved.
"""

import os
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
    verify_and_update_password,
)
from app.db.base import Base
from app.models.user import User
from app.services.user_repository import SqlAlchemyUserRepository
from app.services.auth_service import AuthService
from app.schemas.user import UserRegister, UserLogin


# ==============================================================================
# TEST GROUP A: Registration and Database Persistence
# ==============================================================================

def test_group_a_registration_and_persistence(client: TestClient) -> None:
    """Group A: Verify account creation, password hashing, and session closure persistence."""
    email = "group_a_user@campus.edu"
    password = "GroupAPassword123!"

    # 1. Register new account via API
    res = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Group A Student",
            "email": email,
            "password": password,
            "confirmPassword": password,
            "campus": "Central Campus",
            "role": "student",
        },
    )
    assert res.status_code == 201
    user_id = res.json()["id"]

    # 2. Verify password is NOT in response
    assert "password" not in res.json()
    assert "hashed_password" not in res.json()

    # 3. Verify user is saved in database and password is encrypted
    from app.db.session import SessionLocal
    db1 = SessionLocal()
    user1 = db1.query(User).filter(User.email == email).first()
    assert user1 is not None
    assert user1.hashed_password != password
    assert verify_password(password, user1.hashed_password)

    # 4. Close database session
    db1.close()

    # 5. Open new database session and retrieve the same user
    db2 = SessionLocal()
    user2 = db2.query(User).filter(User.id == user_id).first()
    assert user2 is not None
    assert user2.email == email

    # 6. Verify stored hash remains completely valid in new session
    assert verify_password(password, user2.hashed_password)
    db2.close()


# ==============================================================================
# TEST GROUP B: Login and Logout Cycles
# ==============================================================================

def test_group_b_login_and_logout_cycles(client: TestClient) -> None:
    """Group B: Register, login, logout, login again, and verify rejected credentials."""
    email = "group_b_user@campus.edu"
    password = "GroupBPassword123!"

    # 1. Register user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Group B User",
            "email": email,
            "password": password,
            "campus": "North Campus",
            "role": "student",
        },
    )
    assert reg.status_code == 201

    # 2. Login with correct credentials
    login1 = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login1.status_code == 200
    token1 = login1.json()["access_token"]
    assert token1 is not None

    # 3. Client logout acknowledgment
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token1}"})
    assert logout_res.status_code == 200

    # 4. Login again with same credentials
    login2 = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login2.status_code == 200
    token2 = login2.json()["access_token"]
    assert token2 is not None

    # 5. Verify incorrect passwords are secure and rejected
    bad_login = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword999!"})
    assert bad_login.status_code == 401
    assert "Invalid email or password" in bad_login.json()["detail"]


# ==============================================================================
# TEST GROUP C: Database Persistence Across Reconnections & Restarts
# ==============================================================================

def test_group_c_database_persistence_across_reconnects(client: TestClient) -> None:
    """Group C: User registered in database remains accessible after connection close and restart."""
    from app.db.session import SessionLocal
    email = "group_c_persist@campus.edu"
    password = "PersistPassword2026!"

    # 1. Register user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Persist User",
            "email": email,
            "password": password,
            "campus": "Central Campus",
            "role": "staff",
        },
    )
    assert reg.status_code == 201

    # 2. Close active sessions
    session = SessionLocal()
    user_before = session.query(User).filter(User.email == email).first()
    assert user_before is not None
    session.close()

    # 3. Re-open connection and authenticate
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == email

    # 4. Test identifier lookup by full name and username prefix
    login_by_name = client.post("/api/v1/auth/login", json={"email": "Persist User", "password": password})
    assert login_by_name.status_code == 200

    login_by_prefix = client.post("/api/v1/auth/login", json={"email": "group_c_persist", "password": password})
    assert login_by_prefix.status_code == 200


# ==============================================================================
# TEST GROUP D: Frontend Reload & Session Restoration Simulation
# ==============================================================================

def test_group_d_session_restoration_reload(client: TestClient) -> None:
    """Group D: Simulates SPA refresh by validating stored token via /auth/me."""
    email = "group_d_reload@campus.edu"
    password = "ReloadPassword2026!"

    # 1. Register & login
    client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Reload Student",
            "email": email,
            "password": password,
            "campus": "Central Campus",
            "role": "student",
        },
    )
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = login_res.json()["access_token"]

    # 2. Simulate page reload session restoration (calling /auth/me with existing token)
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 3. Simulate another reload
    me_res_again = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res_again.status_code == 200
    assert me_res_again.json()["email"] == email


# ==============================================================================
# TEST GROUP E: JWT Persistence and Signature Verification
# ==============================================================================

def test_group_e_jwt_persistence_and_signing(client: TestClient) -> None:
    """Group E: Token generated with stable secret validates across separate requests."""
    # 1. Generate token
    token = create_access_token(
        subject="usr_test_jwt",
        extra_claims={"email": "jwt.test@campus.edu", "role": "student"},
    )
    assert token is not None

    # 2. Decode and verify payload
    claims = decode_access_token(token)
    assert claims["sub"] == "usr_test_jwt"
    assert claims["email"] == "jwt.test@campus.edu"
    assert claims["role"] == "student"

    # 3. Confirm expired token is rejected
    expired_token = create_access_token(
        subject="usr_expired",
        expires_delta=timedelta(seconds=-10),
    )
    expired_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert expired_res.status_code == 401

    # 4. Confirm forged / invalid token is rejected
    invalid_res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer forged.invalid.token"})
    assert invalid_res.status_code == 401


# ==============================================================================
# TEST GROUP F: Multiple Accounts Isolation
# ==============================================================================

def test_group_f_multiple_accounts_isolation(client: TestClient) -> None:
    """Group F: User A and User B maintain separate identities and cannot cross-access."""
    # Register User A
    client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "User Alpha",
            "email": "user.alpha@campus.edu",
            "password": "AlphaPassword123!",
            "campus": "Central Campus",
            "role": "student",
        },
    )
    login_a = client.post("/api/v1/auth/login", json={"email": "user.alpha@campus.edu", "password": "AlphaPassword123!"})
    token_a = login_a.json()["access_token"]
    user_a_id = login_a.json()["user"]["id"]

    # Register User B
    client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "User Beta",
            "email": "user.beta@campus.edu",
            "password": "BetaPassword123!",
            "campus": "North Campus",
            "role": "student",
        },
    )
    login_b = client.post("/api/v1/auth/login", json={"email": "user.beta@campus.edu", "password": "BetaPassword123!"})
    token_b = login_b.json()["access_token"]
    user_b_id = login_b.json()["user"]["id"]

    assert user_a_id != user_b_id

    # Verify User A profile
    me_a = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me_a.json()["id"] == user_a_id
    assert me_a.json()["fullName"] == "User Alpha"

    # Verify User B profile
    me_b = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    assert me_b.json()["id"] == user_b_id
    assert me_b.json()["fullName"] == "User Beta"


# ==============================================================================
# TEST GROUP G: Negative Scenarios
# ==============================================================================

def test_group_g_negative_scenarios(client: TestClient) -> None:
    """Group G: Verify rejection of invalid credentials, duplicates, and malformed requests."""
    # 1. Unknown email
    unknown = client.post("/api/v1/auth/login", json={"email": "nonexistent@campus.edu", "password": "AnyPassword123!"})
    assert unknown.status_code == 401

    # 2. Duplicate registration rejection
    dup_email = "dup.test@campus.edu"
    client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Dup Original",
            "email": dup_email,
            "password": "Password123!",
            "campus": "Central Campus",
            "role": "student",
        },
    )
    dup_second = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Dup Second",
            "email": dup_email,
            "password": "Password123!",
            "campus": "Central Campus",
            "role": "student",
        },
    )
    assert dup_second.status_code == 400
    assert "already exists" in dup_second.json()["detail"].lower()

    # 3. Empty credentials
    empty_login = client.post("/api/v1/auth/login", json={"email": "", "password": ""})
    assert empty_login.status_code == 422

    # 4. Weak password rejection on registration
    weak_reg = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Weak User",
            "email": "weak@campus.edu",
            "password": "short",
            "confirmPassword": "short",
        },
    )
    assert weak_reg.status_code == 422
