"""Main application entry point for the FastAPI server."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import routes as v1_routes
# MODIFIED: Import the 'db' object as well to access the database connection
from app.db.mongodb import close_mongo_connection, connect_to_mongo, db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Handle startup and shutdown events."""
    await connect_to_mongo()
    
    # NEW: Create the unique index on startup
    print("Ensuring 'UNIQID' index exists...")
    # This command is idempotent: it will only create the index if it doesn't exist.
    # After
    await db.db["items"].create_index("UNIQID", unique=True, sparse=True)
    print("Index check complete.")
    
    yield
    await close_mongo_connection()

# Create the FastAPI app instance
app = FastAPI(
    lifespan=lifespan,
    title="Inventory Management API",
    version="1.0.0"
)

# Define allowed origins for CORS
origins = [
    "http://localhost:4200",
    "https://inovaantary-frotend.onrender.com/" # Your Angular app
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],
)

# Include the API router
app.include_router(v1_routes.router, prefix="/api/v1")

@app.get("/", tags=["Root"])
async def read_root():
    """A simple root endpoint to confirm the API is running."""
    return {"message": "Welcome to the Inventory Management API!"}