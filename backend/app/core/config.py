from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43_200  # 30 days
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    NOTES_SYNC_PATH: str = "/app/notes"
    FERNET_KEY: str = ""  # generated once: Fernet.generate_key().decode()
    IMAP_POLL_INTERVAL_MINUTES: int = 2

    class Config:
        env_file = ".env"


settings = Settings()
