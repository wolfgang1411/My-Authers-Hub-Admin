import { Component, inject, model } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { AddPublisher } from '../../pages/add-publisher/add-publisher';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
@Component({
  selector: 'app-invite-dialog',
  imports: [
    MatDialogContent,
    MatFormField,
    MatDialogActions,
    SharedModule,
    FormsModule,
    MatButton,
    MatInputModule,
    ReactiveFormsModule,
    MatDialogTitle,
  ],
  templateUrl: './invite-dialog.html',
  styleUrl: './invite-dialog.css',
})
export class InviteDialog {
  readonly dialogRef = inject(MatDialogRef<AddPublisher>);
  readonly data = inject<Inputs>(MAT_DIALOG_DATA);
  text = new FormControl('');

  onNoClick(): void {
    this.dialogRef.close();
  }

  ngOnInit() {
    if (this.data && this.data.validators) {
      this.text.setValidators(this.data.validators);
    }

    if (this.data && this.data.defaultValue) {
      this.text.patchValue(this.data.defaultValue);
    }
  }
}

interface Inputs {
  onSave: (text: string) => void;
  onClose: () => void;
  label?: string;
  heading?: string;
  defaultValue?: string;
  cancelButtonLabel?: string;
  saveButtonLabel?: string;
  placeholder?: string;
  validators?: ValidatorFn[];
  type?: string;
}
