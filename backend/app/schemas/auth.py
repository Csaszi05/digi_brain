import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z0-9]{2,}$"
)


def _check_email(v: str) -> str:
    v = v.strip().lower()
    if not _EMAIL_RE.match(v):
        raise ValueError("Invalid email format")
    return v


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _check_email(v)


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _check_email(v)


class UserResponse(BaseModel):
    id: str
    email: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginResponse(BaseModel):
    """Login result: either a full token, or a 2FA challenge (requires_2fa)."""
    requires_2fa: bool = False
    pending_token: str | None = None
    access_token: str | None = None
    token_type: str = "bearer"
    user: UserResponse | None = None


class TwoFALoginRequest(BaseModel):
    pending_token: str
    code: str


class TwoFASetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    qr_data_url: str


class TwoFAEnableRequest(BaseModel):
    code: str


class TwoFAEnableResponse(BaseModel):
    backup_codes: list[str]


class TwoFADisableRequest(BaseModel):
    current_password: str
    code: str


class TwoFAStatusResponse(BaseModel):
    enabled: bool


class ApiTokenCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ApiTokenCreateResponse(BaseModel):
    """Returned once at creation — `token` is the only time the raw value is shown."""
    id: str
    name: str
    token: str


class ApiTokenResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    last_used_at: datetime | None = None

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    current_password: str
    new_email: str | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("new_email")
    @classmethod
    def validate_new_email(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _check_email(v)
