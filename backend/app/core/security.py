"""Authentication, password hashing, and JWT security utilities."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
import logging
import bcrypt
import jwt

try:
    from pwdlib import PasswordHash
    from pwdlib.hashers.argon2 import Argon2Hasher
    from pwdlib.hashers.bcrypt import BcryptHasher

    _password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))
except ImportError:
    _password_hash = None

logger = logging.getLogger("findit.security")
from app.core.config import settings


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using Argon2id (or bcrypt fallback)."""
    if _password_hash is not None:
        return _password_hash.hash(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify that a plaintext password matches an existing Argon2id or legacy bcrypt hash."""
    if not hashed_password or not plain_password:
        return False
    if _password_hash is not None:
        try:
            return _password_hash.verify(plain_password, hashed_password)
        except Exception:
            pass
    # Fallback direct bcrypt verification
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def verify_and_update_password(plain_password: str, hashed_password: str) -> Tuple[bool, Optional[str]]:
    """Verify password and return updated Argon2 hash if stored hash is legacy format."""
    if not hashed_password or not plain_password:
        return False, None
    if _password_hash is not None:
        try:
            valid, updated_hash = _password_hash.verify_and_update(plain_password, hashed_password)
            return bool(valid), updated_hash
        except Exception:
            pass
    # Fallback to verify_password
    valid = verify_password(plain_password, hashed_password)
    return valid, None


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate a signed stateless JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and verify a signed JWT token. Raises jwt.PyJWTError on invalid/expired tokens."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "iat", "sub"]},
    )
