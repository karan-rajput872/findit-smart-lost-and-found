"""User and Authentication Pydantic schemas."""

import re
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, AliasChoices, field_validator, model_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class UserBase(BaseModel):
    """Shared user properties."""

    email: str = Field(..., max_length=255, description="Institutional email address")
    fullName: str = Field(
        ...,
        min_length=2,
        max_length=100,
        validation_alias=AliasChoices("fullName", "full_name"),
        description="User full legal or preferred campus name",
    )
    campus: str = Field(
        "Central Campus",
        min_length=2,
        max_length=100,
        description="Enrolled campus or branch",
    )
    role: Literal["student", "staff", "admin"] = Field("student", description="Campus role")
    avatarUrl: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("avatarUrl", "avatar_url"),
        description="Profile photo or avatar image URL",
    )

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("email")
    @classmethod
    def normalize_and_validate_email(cls, v: str) -> str:
        """Normalize email and validate format with standard regex."""
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email address format.")
        return cleaned


class UserRegister(UserBase):
    """Payload for user account registration."""

    password: str = Field(..., min_length=8, max_length=128, description="Account password (min 8 characters)")
    confirmPassword: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("confirmPassword", "confirm_password"),
        description="Password confirmation",
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Enforce password complexity (min 8 chars, at least 1 letter, at least 1 digit)."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        return v

    @model_validator(mode="after")
    def verify_password_match(self) -> "UserRegister":
        """Verify that confirmPassword matches password if supplied."""
        if self.confirmPassword is not None and self.password != self.confirmPassword:
            raise ValueError("Passwords do not match.")
        return self


class UserLogin(BaseModel):
    """Payload for authenticating and obtaining a JWT token."""

    email: str = Field(..., max_length=255, description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def normalize_and_validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email address format.")
        return cleaned


class UserResponse(UserBase):
    """Safe user profile response without password hashes."""

    id: str = Field(..., description="Unique user identifier")
    createdAt: str = Field(
        ...,
        validation_alias=AliasChoices("createdAt", "created_at"),
        description="ISO registration timestamp",
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TokenResponse(BaseModel):
    """JWT bearer token and authenticated user payload."""

    access_token: str = Field(..., description="Signed JWT bearer token")
    token_type: str = Field("bearer", description="Token scheme")
    user: UserResponse = Field(..., description="Authenticated user profile")

    model_config = ConfigDict(populate_by_name=True)
