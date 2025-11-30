import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from '../../modules/shared/shared-module';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DistributionType } from '../../interfaces';

@Component({
  selector: 'app-buy-assign-points-dialog',
  imports: [
    MatDialogContent,
    MatFormFieldModule,
    MatDialogActions,
    SharedModule,
    MatButtonModule,
    MatInputModule,
    ReactiveFormsModule,
    MatDialogTitle,
  ],
  templateUrl: './buy-assign-points-dialog.html',
  styleUrl: './buy-assign-points-dialog.css',
})
export class BuyAssignPointsDialog {
  readonly dialogRef = inject(MatDialogRef<BuyAssignPointsDialog>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  pointsControl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1),
    this.positiveIntegerValidator,
  ]);

  get isSuperAdmin(): boolean {
    return this.data.isSuperAdmin;
  }

  get distributionType(): DistributionType {
    return this.data.distributionType;
  }

  get buttonText(): string {
    return this.isSuperAdmin ? 'Assign' : 'Buy';
  }

  get titleText(): string {
    return this.isSuperAdmin ? 'Assign Points' : 'Buy Points';
  }

  private positiveIntegerValidator(
    control: FormControl<number | null>
  ): { [key: string]: boolean } | null {
    const value = control.value as any;
    if (value === null || value === undefined || value === '') {
      return null; // Let required validator handle empty values
    }
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 1 || !Number.isInteger(numValue)) {
      return { positiveInteger: true };
    }
    return null;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.pointsControl.valid && this.pointsControl.value !== null) {
      this.dialogRef.close(this.pointsControl.value);
    }
  }
}

export interface DialogData {
  distributionType: DistributionType;
  isSuperAdmin: boolean;
  publisherId?: number;
  publisherName?: string;
}
