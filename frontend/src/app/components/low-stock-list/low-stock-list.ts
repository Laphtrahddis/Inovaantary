import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../services/inventory';
import { Item } from '../../models/item.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-low-stock-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './low-stock-list.html',
  styleUrl: './low-stock-list.css'
})
export class LowStockList implements OnInit {
  private inventoryService = inject(InventoryService);
  
  lowStockItems: Item[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.inventoryService.getAllItems().subscribe(data => {
      // Filter the full list to find items with quantity less than 10
      this.lowStockItems = data.filter(item => item.quantity < 10);
      this.isLoading = false;
    });
  }
}