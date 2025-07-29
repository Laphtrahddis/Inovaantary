import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InventoryService } from '../../services/inventory';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-item-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-details.html',
  styleUrl: './item-details.css'
})
export class ItemDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private inventoryService = inject(InventoryService);

  item: Item | null = null;

  ngOnInit(): void {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      this.inventoryService.getItemById(itemId).subscribe(data => {
        this.item = data;
      });
    }
  }
  isDynamicAttribute(key: string): boolean {
    const coreFields = ['_id', 'productName', 'description', 'phoneNumber', 'category', 'quantity', 'price', 'dateAdded'];
    return !coreFields.includes(key);
  }

  formatKey(key: string): string {
    // Converts a string like 'isFeatured' to 'Is Featured'
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }
}