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


class ItemBase(BaseModel):
    """Base model with common fields."""
    productName: str
    description: Optional[str] = None
    phoneNumber: Optional[str] = None
    category: str
    quantity: int = Field(..., gt=0)
    price: float = Field(..., gt=0)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class ItemCreate(ItemBase):
    """Model used for creating an item."""
    pass


class ItemOut(ItemBase):
    """Model used for returning an item to the client."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    dateAdded: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class ItemUpdate(BaseModel):
    """Model for updating an item. All fields are optional."""
    productName: Optional[str] = None
    description: Optional[str] = None
    phoneNumber: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = Field(default=None, gt=0)
    price: Optional[float] = Field(default=None, gt=0)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )