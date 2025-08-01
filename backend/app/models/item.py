# app/models/item.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Any
from bson import ObjectId
from pydantic_core import core_schema # <-- ADD THIS IMPORT

# This is the corrected helper class
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _core_schema: core_schema.CoreSchema, _handler
    ) -> dict[str, Any]:
        """
        Return a JSON schema representation of the ObjectId field,
        which is just a string.
        """
        return {"type": "string"}


# In app/models/item.py

class ItemBase(BaseModel):
    """Base model with common fields."""
    UNIQID: str  # <-- NEW: Add the required unique ID field
    productName: str
    description: Optional[str] = None
    phoneNumber: Optional[str] = None
    category: str
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra = 'allow'
    )

# ... (PyObjectId, QuantityAdjustment, ItemCreate, ItemOut classes remain the same) ...

class ItemUpdate(BaseModel):
    """Model for updating an item. All fields are optional."""
    UNIQID: Optional[str] = None # <-- NEW: Also add as optional for updates
    productName: Optional[str] = None
    description: Optional[str] = None
    phoneNumber: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = Field(default=None, gt=0)
    price: Optional[float] = Field(default=None, gt=0)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        # REMOVED json_encoders as it's not needed here and can cause issues
    )

class QuantityAdjustment(BaseModel):
    """Model for adjusting item quantity."""
    change: int


class ItemCreate(ItemBase):
    """Model used for creating an item."""
    pass


class ItemOut(ItemBase):
    """Model used for returning an item to the client."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    dateAdded: datetime
    UNIQID: Optional[str] = None # <-- OVERRIDE: Make UNIQID optional for responses

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class BulkCreateResponse(BaseModel):
    """Response model for bulk item creation."""
    message: str
    inserted_count: int


class PDFUploadResponse(BaseModel):
    """Response model for PDF upload and processing."""
    message: str
    items_parsed: int
    items_inserted: int
    errors: list[str] = []