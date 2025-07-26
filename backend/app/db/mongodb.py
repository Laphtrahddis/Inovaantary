"""Module for database connection logic and lifecycle management."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class DataBase:
    """Holds the database client and instance."""
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

db = DataBase()


async def get_database() -> AsyncIOMotorDatabase:
    """Returns the database instance, ensuring it's connected."""
    if db.db is None:
        raise RuntimeError("Database connection has not been established.")
    return db.db


async def connect_to_mongo():
    """Connects to the MongoDB database using the application settings."""
    print("Connecting to MongoDB...")
    db.client = AsyncIOMotorClient(settings.MONGO_URL)
    db.db = db.client.get_default_database()
    print("Connection successful.")


async def close_mongo_connection():
    """Closes the MongoDB connection."""
    print("Closing MongoDB connection...")
    if db.client:
        db.client.close()
    print("Connection closed.")