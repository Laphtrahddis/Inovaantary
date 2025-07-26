import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [],
  templateUrl: './delete-confirm-dialog.html',
  styleUrl: './delete-confirm-dialog.css'
})
export class DeleteConfirmDialogComponent {
  @Input() itemName: string = '';
  @Output() confirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onClose(): void {
    this.close.emit();
  }
}
