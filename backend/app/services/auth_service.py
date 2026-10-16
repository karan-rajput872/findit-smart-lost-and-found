"""Authentication business logic, credential verification, and safe diagnostic logging."""

import logging
from fastapi import HTTPException, status

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


auth_service = AuthService()
