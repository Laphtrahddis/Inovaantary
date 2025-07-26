"""Module for application configuration and loading environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Loads application settings from the .env file.

    Pydantic's validation ensures that MONGO_URL is loaded from the
    environment at startup, otherwise it will raise an error.
    """
    MONGO_URL: str

    model_config = SettingsConfigDict(env_file=".env")


# Create a single, validated instance of the settings for use in the app.
settings = Settings()