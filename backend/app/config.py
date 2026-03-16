import logging
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_INSECURE_JWT_SECRET = "change-me-to-a-random-secret-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/fintrack"
    JWT_SECRET: str = _INSECURE_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ENVIRONMENT: str = "local"

    CORS_ORIGINS: list[str] = ["http://localhost:8081", "http://localhost:8080"]
    SQL_ECHO: bool = False

    APPLE_CLIENT_ID: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 10


settings = Settings()

if settings.JWT_SECRET == _INSECURE_JWT_SECRET and settings.ENVIRONMENT != "local":
    logger.critical(
        "JWT_SECRET is set to the insecure default. "
        "Set a strong, random JWT_SECRET environment variable before running in %s.",
        settings.ENVIRONMENT,
    )
    sys.exit(1)
