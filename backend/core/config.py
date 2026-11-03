from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    CURRENT_ENV: str = "development"

    DB_DRIVER_NAME: str = "postgresql+psycopg2"
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str

    CORS_ALLOWED_ORIGINS: str = "*"

    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 1025
    MAIL_SERVER: str = "oleoziza_mailhog"

    RUSTFS_INTERNAL_ENDPOINT_URL: str = "http://oleoziza-rustfs:9000"
    RUSTFS_PUBLIC_ENDPOINT_URL: str = "http://localhost:32590"
    RUSTFS_ACCESS_KEY: str
    RUSTFS_SECRET_KEY: str
    RUSTFS_REGION: str = "us-east-1"
    RUSTFS_PRIVATE_BUCKET: str = "oleoziza-private"
    RUSTFS_PUBLIC_BUCKET: str = "oleoziza-public"
    RUSTFS_SIGNED_URL_EXPIRY_IN_SECONDS: int = 900

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        """
        Build the SQLAlchemy URL of the app database.

        Returns:
            str: Connection URL built from the DB_* settings.
        """
        return f"{self.DB_DRIVER_NAME}://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"


@lru_cache
def get_settings() -> Settings:
    """
    Load the settings once from the environment.

    Returns:
        Settings: Cached application settings.
    """
    return Settings()
