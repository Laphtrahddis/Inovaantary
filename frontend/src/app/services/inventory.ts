import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Item } from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/v1/items'; // Our backend URL

  // GET all items (with optional search/filter)
  getItems(params?: { category?: string; search?: string }): Observable<Item[]> {
    return this.http.get<Item[]>(this.apiUrl, { params });
  }

  // POST a new item
  createItem(itemData: Omit<Item, 'id' | 'dateAdded'>): Observable<Item> {
    return this.http.post<Item>(this.apiUrl, itemData);
  }

  getAllItems(): Observable<Item[]> {
    // We set a very high limit to effectively get all items.
    // Adjust if you ever expect more than 10,000 items.
    return this.http.get<Item[]>(this.apiUrl, { params: { limit: 100 } });
  }

  // DELETE an item by its ID
  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  // GET a single item by its ID
  getItemById(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/${id}`);
  }

  // PUT (update) an item by its ID
  updateItem(id: string, itemData: Partial<Item>): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl}/${id}`, itemData);
  }
  // Add this method inside the InventoryService class

  // PATCH to adjust an item's quantity
  adjustQuantity(id: string, change: number): Observable<Item> {
    return this.http.patch<Item>(`${this.apiUrl}/${id}/adjust_quantity`, { change });
  }
  
}