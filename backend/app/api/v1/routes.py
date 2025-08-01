# app/api/v1/routes.py
from fastapi import APIRouter, Body, status, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
# After
from typing import List, Any, Dict, Optional
from datetime import datetime, timezone
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from app.models.item import ItemCreate, ItemOut, ItemUpdate, QuantityAdjustment # <-- Import the new model

from app.db.mongodb import get_database
from app.models.item import ItemCreate, ItemOut
from pymongo.errors import BulkWriteError
from app.models.item import BulkCreateResponse

from fastapi import UploadFile, File
from pydantic import ValidationError
import pdfplumber
import io

from app.models.item import ItemCreate, ItemOut, ItemUpdate, QuantityAdjustment, BulkCreateResponse, PDFUploadResponse

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
    Handles duplicate UNIQID errors.
    """
    item_dict = item.model_dump()
    item_dict["dateAdded"] = datetime.now(timezone.utc)
    
    try:
        # Attempt to insert the new item
        insert_result = await db[COLLECTION_NAME].insert_one(item_dict)
    except DuplicateKeyError:
        # If it fails because the UNIQID is a duplicate, raise a 409 error
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Item with UNIQID '{item.UNIQID}' already exists."
        )
    
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



@router.post(
    "/items/bulk",
    response_model=BulkCreateResponse,
    summary="Create multiple inventory items from a list"
)
async def bulk_create_items(
    items: List[ItemCreate] = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Creates multiple inventory items from a list (e.g., from a CSV import).
    Uses insert_many for efficient bulk insertion.
    """
    if not items:
        raise HTTPException(status_code=400, detail="No items provided")

    # Prepare each item document with a timestamp
    items_to_insert = []
    for item in items:
        item_dict = item.model_dump()
        item_dict["dateAdded"] = datetime.now(timezone.utc)
        items_to_insert.append(item_dict)

    try:
        # Use insert_many with ordered=False to attempt to insert all valid documents
        result = await db[COLLECTION_NAME].insert_many(items_to_insert, ordered=False)
        return {
            "message": "Bulk insert completed.",
            "inserted_count": len(result.inserted_ids)
        }
    except BulkWriteError as e:
        # This error occurs if there are duplicates
        # We can still return a partial success message
        return {
            "message": f"Bulk insert completed with some duplicate errors.",
            "inserted_count": e.details.get('nInserted', 0)
        }

@router.post(
    "/items/upload-pdf",
    response_model=PDFUploadResponse,
    summary="Upload a PDF with items and bulk insert them"
)
async def upload_pdf(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Parses an uploaded PDF file to extract a table of items,
    validates them, and performs a bulk insert.
    """
    contents = await file.read()
    items_to_insert = []
    parsing_errors = []
    total_rows_parsed = 0

    # NEW: Define a mapping from PDF header to our Pydantic model field name
    header_map = {
        'Unique ID (SKU)': 'UNIQID',
        'Product Name': 'productName',
        'Category': 'category',
        'Quantity in Stock': 'quantity',
        'Price (USD)': 'price',
        'Vendor Contact': 'phoneNumber',
        'Description': 'description',
        'Internal Quality Rating (1-5)': 'internalRating', # Example for dynamic fields
        'Status': 'status',
        'Is Featured': 'isFeatured',
        'Purchase Date': 'purchaseDate'
    }

    try:
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                table = page.extract_table()
                if not table or len(table) < 2:
                    continue

                pdf_headers = table[0]
                total_rows_parsed += len(table) - 1

                for i, row in enumerate(table[1:]):
                    raw_row_data = dict(zip(pdf_headers, row))
                    
                    # NEW: Create a clean, mapped dictionary for validation
                    item_data = {}
                    for pdf_header, model_field in header_map.items():
                        if pdf_header in raw_row_data and raw_row_data[pdf_header] is not None:
                            value = raw_row_data[pdf_header]
                            # Clean up common data issues before validation
                            if model_field == 'price' and isinstance(value, str):
                                value = value.replace('$', '').replace(',', '').strip()
                            item_data[model_field] = value

                    try:
                        # Validate the clean, mapped data
                        item = ItemCreate(**item_data)
                        item_dict = item.model_dump()
                        item_dict["dateAdded"] = datetime.now(timezone.utc)
                        items_to_insert.append(item_dict)
                    except ValidationError as e:
                        parsing_errors.append(f"Row {i + 2}: Invalid data - {e.errors()}")
                    except Exception as e:
                        parsing_errors.append(f"Row {i + 2}: General parsing error - {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process PDF file: {str(e)}")

    inserted_count = 0
    if items_to_insert:
        try:
            result = await db[COLLECTION_NAME].insert_many(items_to_insert, ordered=False)
            inserted_count = len(result.inserted_ids)
        except BulkWriteError as e:
            inserted_count = e.details.get('nInserted', 0)
            parsing_errors.append(f"{len(e.details.get('writeErrors', []))} items had duplicate UNIQIDs.")

    return {
        "message": "PDF processing complete.",
        "items_parsed": total_rows_parsed,
        "items_inserted": inserted_count,
        "errors": parsing_errors
    }