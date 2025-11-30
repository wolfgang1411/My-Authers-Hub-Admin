import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-ticket-details-dialog',
  imports: [MatButtonModule, CommonModule],
  templateUrl: './ticket-details-dialog.html',
  styleUrl: './ticket-details-dialog.css',
})
export class TicketDetailsDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<TicketDetailsDialog>
  ) {}

  close() {
    this.dialogRef.close();
  }
}
