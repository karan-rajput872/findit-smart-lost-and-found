"""Authentication and user session routes."""

from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserContactUpdate,
    GoogleLoginRequest,
)
from app.services.auth_service import auth_service
from app.services.user_repository import (
    SqlAlchemyUserRepository,
    get_user_repository,
)
from app.api.deps import get_current_user
from app.core.rate_limit import apply_rate_limit, get_client_ip

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new campus user account",
    description="Create a new participant account with bcrypt password hashing and email uniqueness verification.",
)
def register(
    request: Request,
    user_in: UserRegister,
    user_repo: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> UserResponse:
    """Register new account."""
    client_ip = get_client_ip(request)
    apply_rate_limit(
        key=f"register:{client_ip}",
        max_requests=10,
        window_seconds=60,
        db=user_repo.db,
        error_message="Too many registration attempts from this IP address.",
    )
    return auth_service.register_user(user_in, user_repo)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and obtain JWT token",
    description="Validate campus email and password credentials, returning a signed JWT access token.",
)
def login(
    request: Request,
    login_in: UserLogin,
    user_repo: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> TokenResponse:
    """Log in and retrieve bearer token."""
    client_ip = get_client_ip(request)
    apply_rate_limit(
        key=f"login:{client_ip}",
        max_requests=15,
        window_seconds=60,
        db=user_repo.db,
        error_message="Too many login attempts from this IP address.",
    )
    return auth_service.authenticate_user(login_in, user_repo)


@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Authenticate or register using Google Identity Services",
    description="Validate cryptographic Google ID token, link or create campus user account, and issue FindIt JWT access token.",
)
def google_auth(
    request: Request,
    payload: GoogleLoginRequest,
    user_repo: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> TokenResponse:
    """Log in or sign up via Google Identity Services."""
    client_ip = get_client_ip(request)
    apply_rate_limit(
        key=f"google:{client_ip}",
        max_requests=20,
        window_seconds=60,
        db=user_repo.db,
        error_message="Too many Google authentication attempts from this IP address.",
    )
    return auth_service.authenticate_google_user(payload.idToken, user_repo)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
    description="Retrieve the safe profile metadata of the user whose JWT token is provided in the Authorization header.",
)
def get_current_profile(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Return currently authenticated user."""
    return current_user


@router.patch(
    "/profile/contact",
    response_model=UserResponse,
    summary="Update user contact details and coordination preferences",
    description="Update mobile number, WhatsApp number, and preferred return contact method.",
)
def update_contact_profile(
    contact_in: UserContactUpdate,
    current_user: UserResponse = Depends(get_current_user),
    user_repo: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> UserResponse:
    """Update contact profile information and return preferences."""
    user = user_repo.update_contact(
        user_id=current_user.id,
        phone_number=contact_in.phoneNumber,
        whatsapp_number=contact_in.whatsappNumber,
        whatsapp_same_as_phone=contact_in.whatsappSameAsPhone,
        preferred_contact_method=contact_in.preferredContactMethod,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )
    return user.to_response()


@router.post(
    "/logout",
    response_model=Dict[str, str],
    summary="Log out active session",
    description="Acknowledge session termination. With stateless JWTs, the client must discard its stored access token.",
)
def logout() -> Dict[str, str]:
    """Client logout acknowledgement."""
    return {
        "message": "Successfully logged out. Please remove stored client tokens.",
        "status": "logged_out",
    }
