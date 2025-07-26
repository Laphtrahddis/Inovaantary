import { Component, OnInit, inject } from '@angular/core'; // <-- Import OnInit
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'; // <-- Import ActivatedRoute
import { InventoryService } from '../../services/inventory';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './item-form.html',
  styleUrl: './item-form.css'
})
export class ItemFormComponent implements OnInit { // <-- Implement OnInit
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // <-- Inject ActivatedRoute to read the URL

  itemForm: FormGroup = this.fb.group({
    productName: ['', Validators.required],
    category: ['', Validators.required],
    quantity: [null, [Validators.required, Validators.min(1)]],
    price: [null, [Validators.required, Validators.min(0.01)]],
    description: [''],
    phoneNumber: ['']
  });

  // NEW: Properties to track the component's mode
  isEditMode = false;
  private currentItemId: string | null = null;

  // NEW: ngOnInit lifecycle hook runs when the component loads
  ngOnInit(): void {
    // Check the URL for an 'id' parameter
    this.currentItemId = this.route.snapshot.paramMap.get('id');
    
    if (this.currentItemId) {
      this.isEditMode = true;
      // If an ID exists, fetch that item's data and fill the form
      this.inventoryService.getItemById(this.currentItemId).subscribe(item => {
        this.itemForm.patchValue(item);
      });
    }
  }

  // MODIFIED: onSave now handles both creating and updating
  onSave(): void {
    if (!this.itemForm.valid) {
      console.error('Form is invalid');
      return;
    }

    if (this.isEditMode && this.currentItemId) {
      // If in edit mode, call the update service method
      this.inventoryService.updateItem(this.currentItemId, this.itemForm.value).subscribe({
        next: () => {
          console.log('Item updated successfully!');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => console.error('Error updating item:', err)
      });
    } else {
      // If in create mode, use the original create logic
      this.inventoryService.createItem(this.itemForm.value).subscribe({
        next: () => {
          console.log('Item created successfully!');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => console.error('Error creating item:', err)
      });
    }
  }
}
// import { Component, inject } from '@angular/core';
// import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router } from '@angular/router';
// import { InventoryService } from '../../services/inventory';

// @Component({
//   selector: 'app-item-form',
//   standalone: true,
//   imports: [ReactiveFormsModule],
//   templateUrl: './item-form.html',
//   styleUrl: './item-form.css'
// })
// export class ItemFormComponent {
//   private fb = inject(FormBuilder);
//   private inventoryService = inject(InventoryService);
//   private router = inject(Router);

//   // Define the form structure and validation rules
//   itemForm: FormGroup = this.fb.group({
//     productName: ['', Validators.required],
//     category: ['', Validators.required],
//     quantity: [null, [Validators.required, Validators.min(1)]],
//     price: [null, [Validators.required, Validators.min(0.01)]],
//     description: [''],
//     phoneNumber: ['']
//   });

//   onSave(): void {
//     // Check if the form is valid before submitting
//     if (this.itemForm.valid) {
//       console.log('Form data:', this.itemForm.value);
//       this.inventoryService.createItem(this.itemForm.value).subscribe({
//         next: () => {
//           console.log('Item created successfully!');
//           this.router.navigate(['/dashboard']); // Navigate back to dashboard on success
//         },
//         error: (err) => console.error('Error creating item:', err)
//       });
//     } else {
//       console.error('Form is invalid');
//     }
//   }
// }