import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- Import CommonModule
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InventoryService } from '../../services/inventory';
import formConfig from '../../../assets/item-form.config.json'; // <-- Import the JSON config

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule], // <-- Add CommonModule for @for
  templateUrl: './item-form.html',
  styleUrl: './item-form.css'
})
export class ItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // NEW: Properties for the dynamic form
  formConfig = formConfig;
  itemForm: FormGroup;

  isEditMode = false;
  private currentItemId: string | null = null;

  constructor() {
    // Dynamically build the form from the JSON config
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
  }

  // NEW: Helper function to map JSON validators to Angular Validators
  private getValidators(validatorsConfig: any): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (validatorsConfig.required) {
      validators.push(Validators.required);
    }
    if (validatorsConfig.min) {
      validators.push(Validators.min(validatorsConfig.min));
    }
    // NEW: Add maxLength validator
    if (validatorsConfig.maxLength) {
      validators.push(Validators.maxLength(validatorsConfig.maxLength));
    }
    // NEW: Add pattern validator
    if (validatorsConfig.pattern) {
      validators.push(Validators.pattern(validatorsConfig.pattern));
    }
    return validators;
  }

  onSave(): void {
    if (!this.itemForm.valid) {
      console.error('Form is invalid');
      return;
    }
    const action = this.isEditMode
      ? this.inventoryService.updateItem(this.currentItemId!, this.itemForm.value)
      : this.inventoryService.createItem(this.itemForm.value);

    action.subscribe({
      next: () => {
        console.log(`Item ${this.isEditMode ? 'updated' : 'created'} successfully!`);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} item:`, err)
    });
  }
}