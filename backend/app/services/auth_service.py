"""Authentication business logic and credential verification service."""

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
    create_access_token,
)


class AuthService:
    """Service encapsulating user registration, credential verification, and token issuance."""

    @staticmethod
    def register_user(
        user_in: UserRegister,
        repo: SqlAlchemyUserRepository,
    ) -> UserResponse:
        """Register a new user account with duplicate email validation and password hashing."""
        existing = repo.get_by_email(user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        hashed_password = get_password_hash(user_in.password)
        created_user = repo.create(user_in, hashed_password)
        return created_user.to_response()

    @staticmethod
    def authenticate_user(
        login_in: UserLogin,
        repo: SqlAlchemyUserRepository,
    ) -> TokenResponse:
        """Authenticate user credentials and generate a signed JWT bearer token."""
        user = repo.get_by_email(login_in.email)
        if not user or not verify_password(login_in.password, user.hashed_password):
            # Uniform error message prevents email address enumeration
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(
            subject=user.id,
            extra_claims={
                "email": user.email,
                "role": user.role,
                "name": user.full_name,
            },
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user.to_response(),
        )


auth_service = AuthService()
