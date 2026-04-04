from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env", env_file_encoding="utf-8", extra="ignore"
    )

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/fintrack"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ENVIRONMENT: str = "local"

    CORS_ORIGINS: list[str] = ["http://localhost:8081", "http://localhost:8080"]
    SQL_ECHO: bool = False

    APPLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_ID: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 10
    IS_DROP_TABLES: bool = False
    DEV_ADMIN_KEY: str = ""

    MAX_CODE_RESENDS: int = 3
    MAX_VERIFICATION_ATTEMPTS: int = 5
    APPLE_KEYS_URL: str = "https://appleid.apple.com/auth/keys"
    APPLE_KEYS_TTL: int = 3600
    DEFAULT_CATEGORY_COLOR: str = "#6B7280"


# Rate-limit constants (not env-driven)
RATE_LIMIT_AUTH_DEFAULT = "5/minute"
RATE_LIMIT_VERIFY = "3/minute"
RATE_LIMIT_RESEND = "3/minute"

settings = Settings()
