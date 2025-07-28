# app/api/v1/routes.py
from fastapi import APIRouter, Body, status, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
# After
from typing import List, Any, Dict, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.models.item import ItemCreate, ItemOut, ItemUpdate, QuantityAdjustment # <-- Import the new model

from app.db.mongodb import get_database
from app.models.item import ItemCreate, ItemOut

# Create a new router instance
router = APIRouter()

# Define the collection name
COLLECTION_NAME = "items"

@router.post(
    "/items/create",
    response_model=ItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new inventory item"
)
async def create_item(
    item: ItemCreate = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Creates a new inventory item and stores it in the database.
    """
    item_dict = item.model_dump()
    # Add the server-generated timestamp
    item_dict["dateAdded"] = datetime.now(timezone.utc)
    
    insert_result = await db[COLLECTION_NAME].insert_one(item_dict)
    
    # Retrieve the newly created document to return it in the response
    new_item = await db[COLLECTION_NAME].find_one({"_id": insert_result.inserted_id})
    
    return new_item

@router.get(
    "/items/getitems", response_model=List[ItemOut], summary="Retrieve a list of inventory items"
)
async def list_items(
    db: AsyncIOMotorDatabase = Depends(get_database),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by product name"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    # NEW: Parameters for price range and sorting
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    sort_by: Optional[str] = Query(None, description="Field to sort by (e.g., 'price')"),
    sort_order: int = Query(1, description="Sort order: 1 for asc, -1 for desc")
):
    skip = (page - 1) * limit
    query_filter = {}
    
    # --- Search and Category Filter (Existing Logic) ---
    if category:
        query_filter["category"] = category
    if search:
        query_filter["productName"] = {"$regex": search, "$options": "i"}

    # --- NEW: Price Range Filter Logic ---
    price_filter = {}
    if min_price is not None:
        price_filter["$gte"] = min_price
    if max_price is not None:
        price_filter["$lte"] = max_price
    if price_filter:
        query_filter["price"] = price_filter

    # --- Database Query ---
    cursor = db[COLLECTION_NAME].find(query_filter)

    # --- NEW: Sorting Logic ---
    if sort_by:
        cursor = cursor.sort(sort_by, sort_order)

    items = await cursor.skip(skip).limit(limit).to_list(length=limit)
    return items
@router.get(
    "/items/item/{item_id}",
    response_model=ItemOut,
    summary="Get a single item by ID"
)
async def get_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Retrieves a single inventory item by its unique ID.
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    item = await db[COLLECTION_NAME].find_one({"_id": ObjectId(item_id)})

    if item is None:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")
    
    return item


@router.put(
    "/items/update/{item_id}",
    response_model=ItemOut,
    summary="Update an item by ID"
)
async def update_item(
    item_id: str,
    item_update: ItemUpdate = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Updates an existing inventory item.
    Only the fields provided in the request body will be updated.
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    # Get the update data, excluding any fields that were not set
    update_data = item_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    updated_item = await db[COLLECTION_NAME].find_one_and_update(
        {"_id": ObjectId(item_id)},
        {"$set": update_data},
        return_document=True # Returns the document AFTER the update
    )

    if updated_item is None:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")

    return updated_item


@router.delete(
    "/items/delete/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an item by ID"
)
async def delete_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Deletes an inventory item from the database.
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    delete_result = await db[COLLECTION_NAME].delete_one({"_id": ObjectId(item_id)})

    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")
    
    return # On success, return nothing with a 204 status code

@router.patch(
    "/items/{item_id}/adjust_quantity",
    response_model=ItemOut,
    summary="Increment or decrement an item's quantity"
)
async def adjust_item_quantity(
    item_id: str,
    adjustment: QuantityAdjustment = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Adjusts an item's quantity by the amount specified in 'change'.
    Uses MongoDB's $inc operator for an atomic update.
    """
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item ID format")

    updated_item = await db[COLLECTION_NAME].find_one_and_update(
        {"_id": ObjectId(item_id)},
        {"$inc": {"quantity": adjustment.change}},
        return_document=True
    )

    if updated_item is None:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")

    return updated_item