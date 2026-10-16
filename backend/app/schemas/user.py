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

    email: str = Field(
        ...,
        max_length=255,
        validation_alias=AliasChoices("email", "username", "identifier"),
        description="Registered email address or campus username",
    )
    password: str = Field(..., min_length=1, description="Account password")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("email")
    @classmethod
    def normalize_and_validate_identifier(cls, v: str) -> str:
        """Trim identifier and normalize email if '@' present."""
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Email or username is required.")
        if "@" in cleaned:
            cleaned = cleaned.lower()
            if not EMAIL_REGEX.match(cleaned):
                raise ValueError("Invalid email address format.")
        return cleaned



def normalize_phone_number(v: Optional[str]) -> Optional[str]:
    """Clean and validate optional phone number in international or standard format."""
    if not v:
        return None
    cleaned = v.strip()
    if not cleaned:
        return None
    # Strip common formatting characters: spaces, hyphens, parentheses, periods
    digits_only = re.sub(r"[\s\-\(\)\.]", "", cleaned)
    if not digits_only:
        return None
    
    # Must match international format: optional '+' followed by 7-15 digits
    if not re.match(r"^\+?[1-9]\d{6,14}$", digits_only):
        raise ValueError("Invalid phone number. Please provide a valid phone number (e.g. +919876543210 or 9876543210).")
    
    # Standardize: if no '+' prefix, add '+' if 11-15 digits or default to +91 if standard 10 digits
    if not digits_only.startswith("+"):
        if len(digits_only) == 10:
            digits_only = "+91" + digits_only  # Default campus country code
        else:
            digits_only = "+" + digits_only
            
    return digits_only


class UserContactUpdate(BaseModel):
    """Payload to update current user's contact information and preferences."""

    phoneNumber: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("phoneNumber", "phone_number"),
        description="Mobile phone number with country code",
    )
    whatsappNumber: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("whatsappNumber", "whatsapp_number"),
        description="WhatsApp phone number with country code",
    )
    whatsappSameAsPhone: bool = Field(
        True,
        validation_alias=AliasChoices("whatsappSameAsPhone", "whatsapp_same_as_phone"),
        description="Whether WhatsApp number is identical to mobile number",
    )
    preferredContactMethod: Literal["findit_chat", "whatsapp", "phone_call"] = Field(
        "findit_chat",
        validation_alias=AliasChoices("preferredContactMethod", "preferred_contact_method"),
        description="Preferred return coordination channel",
    )

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("phoneNumber", "whatsappNumber")
    @classmethod
    def validate_and_normalize_phone(cls, v: Optional[str]) -> Optional[str]:
        return normalize_phone_number(v)

    @model_validator(mode="after")
    def sync_whatsapp_if_same(self) -> "UserContactUpdate":
        if self.whatsappSameAsPhone and self.phoneNumber:
            self.whatsappNumber = self.phoneNumber
        return self


class UserResponse(UserBase):
    """Safe user profile response without password hashes."""

    id: str = Field(..., description="Unique user identifier")
    phoneNumber: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("phoneNumber", "phone_number"),
        description="Private mobile phone number",
    )
    whatsappNumber: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("whatsappNumber", "whatsapp_number"),
        description="Private WhatsApp number",
    )
    whatsappSameAsPhone: bool = Field(
        True,
        validation_alias=AliasChoices("whatsappSameAsPhone", "whatsapp_same_as_phone"),
        description="Whether WhatsApp is same as mobile",
    )
    preferredContactMethod: str = Field(
        "findit_chat",
        validation_alias=AliasChoices("preferredContactMethod", "preferred_contact_method"),
        description="Preferred return coordination channel",
    )
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

