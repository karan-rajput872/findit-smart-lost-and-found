"""Authentication business logic, credential verification, and safe diagnostic logging."""

import logging
from fastapi import HTTPException, status

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
)
from app.services.user_repository import SqlAlchemyUserRepository
from app.core.security import (
    get_password_hash,
    verify_password,
    verify_and_update_password,
    create_access_token,
)

logger = logging.getLogger("findit.auth")


class AuthService:
    """Service encapsulating user registration, credential verification, and token issuance."""

    @staticmethod
    def register_user(
        user_in: UserRegister,
        repo: SqlAlchemyUserRepository,
    ) -> UserResponse:
        """Register a new user account with duplicate email validation and password hashing."""
        sanitized_email = user_in.email.strip().lower()
        existing = repo.get_by_email(sanitized_email)
        if existing:
            logger.info("Registration rejected: Account with email '%s' already exists.", sanitized_email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        hashed_password = get_password_hash(user_in.password)
        created_user = repo.create(user_in, hashed_password)
        logger.info(
            "Registration successful: Created user ID '%s' for email '%s' on campus '%s'.",
            created_user.id,
            created_user.email,
            created_user.campus,
        )
        return created_user.to_response()

    @staticmethod
    def authenticate_user(
        login_in: UserLogin,
        repo: SqlAlchemyUserRepository,
    ) -> TokenResponse:
        """Authenticate user credentials and generate a signed JWT bearer token.

        Safely logs internal diagnostic details without leaking sensitive information.
        """
        sanitized_ident = login_in.email.strip()
        user = repo.get_by_identifier(sanitized_ident)

        if not user:
            logger.warning(
                "Authentication failed: User identifier '%s' not found in database.",
                sanitized_ident,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        valid, new_hash = verify_and_update_password(login_in.password, user.hashed_password)
        if not valid:
            logger.warning(
                "Authentication failed: Invalid password supplied for user ID '%s' ('%s').",
                user.id,
                user.email,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Transparently upgrade legacy hash to primary Argon2id format
        if new_hash:
            try:
                user.hashed_password = new_hash
                repo.db.commit()
                logger.info("Upgraded legacy password hash to Argon2id for user ID '%s'.", user.id)
            except Exception as e:
                logger.warning("Could not persist upgraded password hash: %s", e)

        access_token = create_access_token(
            subject=user.id,
            extra_claims={
                "email": user.email,
                "role": user.role,
                "name": user.full_name,
            },
        )

        logger.info(
            "Authentication successful: User ID '%s' ('%s', role: %s) signed in.",
            user.id,
            user.email,
            user.role,
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user.to_response(),
        )

    @staticmethod
    def verify_google_token(id_token_str: str) -> dict:
        """Verify Google ID token cryptographically, checking signature, expiry, audience, and issuer."""
        if not id_token_str or not isinstance(id_token_str, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google ID token string is required.",
            )

        try:
            # If settings.GOOGLE_CLIENT_ID is configured, enforce audience check
            audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
            id_info = google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                audience=audience,
            )
        except ValueError as e:
            logger.warning("Google ID token verification failed: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google authentication failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Unexpected error during Google token verification: %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google authentication token could not be verified.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Issuer check: Must be issued by Google
        valid_issuers = ("accounts.google.com", "https://accounts.google.com")
        if id_info.get("iss") not in valid_issuers:
            logger.warning("Google token issuer invalid: '%s'", id_info.get("iss"))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token issuer.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verified email check: Must be marked email_verified by Google
        is_verified = id_info.get("email_verified")
        if is_verified is not True and str(is_verified).lower() != "true":
            logger.warning("Google authentication rejected: Email '%s' is not verified by Google.", id_info.get("email"))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account email address is not verified.",
            )

        # Subject identifier check: Stable external ID
        sub = id_info.get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google ID token is missing the subject identifier (sub).",
            )

        # Email check: Non-empty email
        email = id_info.get("email")
        if not email or not isinstance(email, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google ID token is missing a valid email address.",
            )

        return id_info

    @classmethod
    def authenticate_google_user(
        cls,
        id_token_str: str,
        repo: SqlAlchemyUserRepository,
    ) -> TokenResponse:
        """Authenticate user using verified Google ID token with safe account linking."""
        id_info = cls.verify_google_token(id_token_str)
        google_sub = str(id_info["sub"]).strip()
        email = str(id_info["email"]).strip().lower()
        full_name = str(id_info.get("name") or "").strip() or email.split("@")[0]
        avatar_url = id_info.get("picture")

        # Case B: Existing user found by Google subject ID
        user = repo.get_by_google_sub(google_sub)
        if user:
            logger.info("Google authentication: Found existing account by google_sub for user ID '%s'.", user.id)
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
                repo.db.commit()
        else:
            # Check if user with this email already exists
            existing_email_user = repo.get_by_email(email)
            if existing_email_user:
                if existing_email_user.google_sub and existing_email_user.google_sub != google_sub:
                    # Case D: Account already linked to a different Google identity
                    logger.warning(
                        "Google authentication rejected: Email '%s' already associated with a different Google sub.",
                        email,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This email address is already associated with a different Google account.",
                    )
                # Case C: Safe account linking
                logger.info(
                    "Google authentication: Linking verified Google identity to existing account user ID '%s' ('%s').",
                    existing_email_user.id,
                    existing_email_user.email,
                )
                user = repo.link_google_account(
                    user=existing_email_user,
                    google_sub=google_sub,
                    avatar_url=avatar_url,
                )
            else:
                # Case A: Brand new Google user
                logger.info("Google authentication: Provisioning new campus student account for '%s'.", email)
                user = repo.create_google_user(
                    email=email,
                    full_name=full_name,
                    google_sub=google_sub,
                    avatar_url=avatar_url,
                    campus="Central Campus",
                )

        access_token = create_access_token(
            subject=user.id,
            extra_claims={
                "email": user.email,
                "role": user.role,
                "name": user.full_name,
            },
        )

        logger.info(
            "Google authentication successful: Issued FindIt JWT for user ID '%s' ('%s', role: %s).",
            user.id,
            user.email,
            user.role,
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user.to_response(),
        )


auth_service = AuthService()
