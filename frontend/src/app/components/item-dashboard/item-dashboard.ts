import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../services/inventory';
import { RouterLink } from '@angular/router';
import { Item } from '../../models/item.model';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog'; // <-- Import dialog
import { Subject } from 'rxjs'; // <-- NEW: Import Subject
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'; // <-- NEW: Import operators
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import * as Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-item-dashboard',
  standalone: true,
  imports: [CommonModule, DeleteConfirmDialogComponent, RouterLink, ReactiveFormsModule],
  templateUrl: './item-dashboard.html',
  styleUrl: './item-dashboard.css'
})
export class ItemDashboardComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private searchSubject = new Subject<string>();
  private allItems: Item[] = [];
  private fb = inject(FormBuilder);
  items: Item[] = [];
  isDialogOpen = false;
  itemToDelete: Item | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  isFilterOpen = false;
  filterForm: FormGroup;
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      Papa.parse(file, {
        header: true, // Treats the first row as headers
        skipEmptyLines: true,
        complete: (result) => {
          console.log('Parsed CSV data:', result.data);
          // The data needs to have quantity and price converted to numbers
          const itemsToCreate = result.data.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            price: Number(item.price) || 0,
          }));

          this.inventoryService.bulkCreateItems(itemsToCreate).subscribe({
            next: (response) => {
              alert(`${response.inserted_count} items imported successfully!`);
              this.loadItems(); // Refresh the table
              this.loadAllItemsForStats(); // Refresh the stats
            },
            error: (err) => {
              console.error('Error during bulk import:', err);
              alert('An error occurred during the import.');
            }
          });
        }
      });
    }
  }
   constructor() {
    // NEW: Initialize the filter form
    this.filterForm = this.fb.group({
      min_price: [null],
      max_price: [null],
      sort_by: ['price'],
      sort_order: [1] // 1 for asc, -1 for desc
    });
  }

  ngOnInit(): void {
    this.loadItems();
    this.loadAllItemsForStats();
    // NEW: Subscribe to the search subject to trigger API calls
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after the user stops typing
      distinctUntilChanged() // Only trigger if the value has changed
    ).subscribe(searchTerm => {
      this.currentPage = 1; 
      this.loadItems({ search: searchTerm });
    });
  }
  // NEW: This method is called by the input field in the HTML
  onSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.searchSubject.next(searchTerm);
  }

  get totalItems(): number {
    return this.allItems.length;
  }

  get totalValue(): number {
    return this.allItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get categoryCount(): number {
    const uniqueCategories = new Set(this.allItems.map(item => item.category));
    return uniqueCategories.size;
  }
    get lowStockItems(): number {
    // Counts items with quantity less than 10
    return this.allItems.filter(item => item.quantity < 10).length;
  }

  get mostValuableItem(): number {
    if (this.allItems.length === 0) {
      return 0;
    }
    // Finds the item with the highest total value (price * quantity)
    const mostValuable = this.allItems.reduce((max, item) => 
      (max.price * max.quantity) > (item.price * item.quantity) ? max : item
    );
    return mostValuable.price;
  }
  
  // Add this getter inside the ItemDashboardComponent class

  get averagePrice(): number {
    if (this.allItems.length === 0) {
      return 0;
    }
    // Calculates the sum of all prices and divides by the number of items
    const total = this.allItems.reduce((sum, item) => sum + (item.price*item.quantity), 0);
    return total / this.allItems.length;
  }
  // NEW: Method to load all items for stat calculations
  loadAllItemsForStats(): void {
    this.inventoryService.getAllItems().subscribe(data => {
      this.allItems = data;
    });
  }

  // Add these two new getters inside the ItemDashboardComponent class



  // After
loadItems(params: { search?: string } = {}): void {
  const rawFilters = this.filterForm.value;

  // NEW: Clean up the filter params to remove empty values
  const cleanFilters: any = {};
  Object.keys(rawFilters).forEach(key => {
    const value = rawFilters[key];
    if (value !== null && value !== undefined && value !== '') {
      cleanFilters[key] = value;
    }
  });

  const pageParams = { 
    page: this.currentPage, 
    limit: this.itemsPerPage, 
    ...params, 
    ...cleanFilters // <-- Use the clean filters object
  };

  this.inventoryService.getItems(pageParams).subscribe(data => {
    this.items = data;
  });
}
  
  // NEW: Method to show/hide the filter panel
  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
  }

  // NEW: Method to apply the filters and reload the data
  applyFilters(): void {
    this.currentPage = 1; // Reset to first page
    this.loadItems();
    this.isFilterOpen = false; // Close the panel
  }
  // This now opens the dialog
  openDeleteDialog(item: Item): void {
    this.itemToDelete = item;
    this.isDialogOpen = true;
  }

  nextPage(): void {
  this.currentPage++;
  this.loadItems();
}

previousPage(): void {
  if (this.currentPage > 1) {
    this.currentPage--;
    this.loadItems();
  }
}

  closeDeleteDialog(): void {
    this.isDialogOpen = false;
    this.itemToDelete = null;
  }

  // Add these two methods inside the ItemDashboardComponent class

  incrementQuantity(item: Item): void {
    this.inventoryService.adjustQuantity(item._id, 1).subscribe({
      next: (updatedItem) => {
        // Update the item in the local array for instant UI feedback
        item.quantity = updatedItem.quantity;
        this.loadAllItemsForStats()
      },
      error: (err) => console.error('Error incrementing quantity:', err)
    });
  }

  decrementQuantity(item: Item): void {
    // Prevent quantity from going below 1
    if (item.quantity <= 1) return;

    this.inventoryService.adjustQuantity(item._id, -1).subscribe({
      next: (updatedItem) => {
        // Update the item in the local array for instant UI feedback
        item.quantity = updatedItem.quantity;
        this.loadAllItemsForStats()
      },
      error: (err) => console.error('Error decrementing quantity:', err)
    });
  }

  // This is called when the dialog's confirm event is emitted
  onConfirmDelete(): void {
    if (!this.itemToDelete) return;

    this.inventoryService.deleteItem(this.itemToDelete._id).subscribe({
      next: () => {
        console.log('Item deleted successfully!');
        this.loadItems(); // Refresh the list
        this.closeDeleteDialog(); // Close the dialog
        this.loadAllItemsForStats();
      },
      error: (err) => console.error('Error deleting item:', err)
    });
  }

  exportPdf(): void {
    if (this.allItems.length === 0) {
      alert('No items to export.');
      return;
    }

    const doc = new jsPDF();
    const tableHead = [['Unique ID', 'Product Name', 'Category', 'Quantity', 'Price']];
    const tableBody = this.allItems.map(item => [
      item.UNIQID,
      item.productName,
      item.category,
      item.quantity,
      `$${item.price.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      didDrawPage: (data) => {
        // Header
        doc.setFontSize(20);
        doc.text('Inventory Report', data.settings.margin.left, 15);
      }
    });

    doc.save(`inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  onPdfFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      this.inventoryService.uploadPdf(file).subscribe({
        next: (response) => {
          // Build a detailed success/error message
          let message = `${response.message}\nParsed: ${response.items_parsed}\nInserted: ${response.items_inserted}`;
          if (response.errors && response.errors.length > 0) {
            message += `\nErrors: ${response.errors.join(', ')}`;
          }
          alert(message);
          this.loadItems(); // Refresh the table
          this.loadAllItemsForStats(); // Refresh the stats
        },
        error: (err) => {
          console.error('Error during PDF import:', err);
          alert(`An error occurred: ${err.error.detail || 'Please check the file and try again.'}`);
        },
        // Reset the file input so you can upload the same file again
        complete: () => (input.value = '') 
      });
    }
  }
}