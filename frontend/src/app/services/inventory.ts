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

getItems(params?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    min_price?: number;
    max_price?: number;
    sort_by?: string;
    sort_order?: number;
  }): Observable<Item[]> {
    return this.http.get<Item[]>(this.apiUrl+'/getitems', { params });
  }

  // POST a new item___________________________________________________________________________________________________________-
  createItem(itemData: Omit<Item, 'id' | 'dateAdded'>): Observable<Item> {
    return this.http.post<Item>(this.apiUrl+'/create', itemData);
  }


  //____________________________________________________________________________________________________________________________
  getAllItems(): Observable<Item[]> {
    // We set a very high limit to effectively get all items.
    // Adjust if you ever expect more than 10,000 items.
    return this.http.get<Item[]>(this.apiUrl+'/getitems', { params: { limit: 100 } });
  }

  // DELETE an item by its ID____________________________________________________________________________________________________________
  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete/${id}`);
  }
// GET a single item by its ID________________________________________- _____________-  ___________________________________________
  getItemById(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/item/${id}`);
  }

  // PUT (update) an item by its ID___________________________________________________________________________________________________
  updateItem(id: string, itemData: Partial<Item>): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl}/update/${id}`, itemData);
  }
  // Add this method inside the InventoryService class

  // PATCH to adjust an item's quantity_________________________________________________________________________________________
  adjustQuantity(id: string, change: number): Observable<Item> {
    return this.http.patch<Item>(`${this.apiUrl}/${id}/adjust_quantity`, { change });
  }
  
  // Add this method inside the InventoryService class

  // POST a list of new items for bulk creation
  bulkCreateItems(items: Item[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, items);
  }

  uploadPdf(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    // Note the new endpoint URL here
    return this.http.post<any>(`${this.apiUrl}/upload-pdf`, formData);
  }
}