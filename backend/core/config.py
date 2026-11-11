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

    REDIS_HOST: str = "oleoziza_redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    CELERY_BROKER_DB: int = 0
    CELERY_RESULT_DB: int = 1
    CELERY_BROKER_TIMEOUT_IN_SECONDS: float = 1.0
    CELERY_VISIBILITY_TIMEOUT_IN_SECONDS: int = 3600

    AUTH_PRIVATE_JWK: str
    AUTH_ACCESS_TOKEN_EXPIRY_IN_SECONDS: int = 900
    AUTH_REFRESH_TOKEN_EXPIRY_IN_SECONDS: int = 2_592_000
    AUTH_REFRESH_COOKIE_PATH: str = "/api/auth"
    AUTH_REFRESH_COOKIE_SECURE: bool = True
    AUTH_MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    AUTH_LOCK_DURATION_IN_SECONDS: int = 900
    AUTH_INVITATION_EXPIRY_IN_SECONDS: int = 604_800

    FRONT_BASE_URL: str = "http://localhost:32501"

    SEED_OWNER_EMAIL: str = ""
    SEED_OWNER_PASSWORD: str = ""
    SEED_OWNER_FIRST_NAME: str = ""
    SEED_OWNER_LAST_NAME: str = ""

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

    @property
    def celery_broker_url(self) -> str:
        """
        Build the Redis URL Celery uses as its broker.

        Returns:
            str: Redis URL on the broker database.
        """
        return self._build_redis_url(self.CELERY_BROKER_DB)

    @property
    def celery_result_backend_url(self) -> str:
        """
        Build the Redis URL Celery stores task results in.

        Returns:
            str: Redis URL on the result database.
        """
        return self._build_redis_url(self.CELERY_RESULT_DB)

    def _build_redis_url(self, database: int) -> str:
        """
        Build a Redis URL on one logical database, with the password when one is set.

        Args:
            database (int): Redis logical database number.

        Returns:
            str: Redis connection URL.
        """
        credentials = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{credentials}{self.REDIS_HOST}:{self.REDIS_PORT}/{database}"


@lru_cache
def get_settings() -> Settings:
    """
    Load the settings once from the environment.

    Returns:
        Settings: Cached application settings.
    """
    return Settings()
