import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InventoryService } from '../../services/inventory';
import formConfig from '../../../assets/item-form.config.json';
import { HttpErrorResponse } from '@angular/common/http'; // <-- NEW: Import HttpErrorResponse

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './item-form.html',
  styleUrl: './item-form.css'
})
export class ItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  formConfig = formConfig;
  itemForm: FormGroup;
  isEditMode = false;
  private currentItemId: string | null = null;
  
  // NEW: Property to hold our error message
  errorMessage: string | null = null;

  constructor() {
    this.itemForm = this.fb.group({});
    this.formConfig.forEach(field => {
      const validators = this.getValidators(field.validators);
      this.itemForm.addControl(field.name, this.fb.control(null, validators));
    });
  }

  ngOnInit(): void {
    this.currentItemId = this.route.snapshot.paramMap.get('id');
    if (this.currentItemId) {
      this.isEditMode = true;
      this.inventoryService.getItemById(this.currentItemId).subscribe(item => {
        this.itemForm.patchValue(item);
      });
    }

    // NEW: Clear the error message whenever the user changes a value in the form
    this.itemForm.valueChanges.subscribe(() => {
      this.errorMessage = null;
    });
  }

  private getValidators(validatorsConfig: any): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (validatorsConfig.required) { validators.push(Validators.required); }
    if (validatorsConfig.min) { validators.push(Validators.min(validatorsConfig.min)); }
    if (validatorsConfig.maxLength) { validators.push(Validators.maxLength(validatorsConfig.maxLength)); }
    if (validatorsConfig.pattern) { validators.push(Validators.pattern(validatorsConfig.pattern)); }
    return validators;
  }

  onSave(): void {
    if (!this.itemForm.valid) {
      this.errorMessage = 'Please fill out all required fields correctly.';
      return;
    }
    
    // Reset error message before trying to save
    this.errorMessage = null;

    const action = this.isEditMode
      ? this.inventoryService.updateItem(this.currentItemId!, this.itemForm.value)
      : this.inventoryService.createItem(this.itemForm.value);

    action.subscribe({
      next: () => {
        console.log(`Item ${this.isEditMode ? 'updated' : 'created'} successfully!`);
        this.router.navigate(['/dashboard']);
      },
      // MODIFIED: Updated error handling
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          // If it's a 409 Conflict error, display the message from the backend
          this.errorMessage = err.error.detail;
        } else {
          // For any other error, show a generic message
          this.errorMessage = 'An unexpected error occurred. Please try again.';
          console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} item:`, err);
        }
      }
    });
  }
}