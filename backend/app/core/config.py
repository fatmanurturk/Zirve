from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),  # backend/ veya proje kökü
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = Field(default="Zirve — Doğa Sporları Gönüllülük Platformu")

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@postgres:5432/zirve",
        description="SQLAlchemy async database URL",
    )

    SECRET_KEY: str = Field(
        default="change-this-in-production",
        description="JWT signing secret key",
    )

    ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm",
    )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token lifetime in minutes",
    )

    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token lifetime in days",
    )

    BACKEND_CORS_ORIGINS: List[str] = Field(
        default_factory=list,
        description="Allowed CORS origins for the backend",
    )

    # Email Settings
    SMTP_HOST: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_FROM: str = Field(default="")
    SMTP_STARTTLS: bool = Field(default=True)
    SMTP_SSL_TLS: bool = Field(default=False)

    # Groq AI Settings
    GROQ_API_KEY: str = Field(default="")
    GROQ_API_URL: str = Field(default="https://api.groq.com/openai/v1/chat/completions")
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile")

    # VakıfBank Sanal POS
    VAKIFBANK_API_URL: str = Field(default="https://sanalpos.vakifbank.com.tr/api/v1")
    VAKIFBANK_API_KEY: str = Field(default="")
    VAKIFBANK_MERCHANT_ID: str = Field(default="")

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):  # type: ignore[override]
        """
        Accepts:
        - JSON array: '["http://localhost:3000"]'
        - Comma-separated string: "http://localhost,http://localhost:3000"
        - List[str]
        """
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                import json

                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, (list, tuple)):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return []


@lru_cache
def get_settings() -> Settings:
    return Settings()
