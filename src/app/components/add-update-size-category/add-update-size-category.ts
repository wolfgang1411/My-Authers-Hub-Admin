import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogContent,
  MatDialogActions,
  MatDialogTitle,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SizeCategory, CreateSizeCategory, UpdateSizeCategory } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-add-update-size-category',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogTitle,
  ],
  templateUrl: './add-update-size-category.html',
  styleUrl: './add-update-size-category.css',
})
export class AddUpdateSizeCategory implements OnInit {
  data = inject<Inputs>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<AddUpdateSizeCategory>);

  form = new FormGroup({
    name: new FormControl<string>('', [Validators.required]),
    packetPrice: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    weightMultiplayer: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    insideCoverPrice: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });

  ngOnInit(): void {
    if (this.data.defaultValue) {
      this.updateValue(this.data.defaultValue);
    }
  }

  updateValue(data?: SizeCategory) {
    this.form.patchValue(
      {
        name: data?.name || '',
        packetPrice: data?.packetPrice || null,
        weightMultiplayer: data?.weightMultiplayer || null,
        insideCoverPrice: data?.insideCoverPrice || null,
      },
      { emitEvent: false }
    );
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = this.form.value;
      const categoryData: CreateSizeCategory | UpdateSizeCategory = {
        name: formValue.name!,
        packetPrice: formValue.packetPrice!,
        weightMultiplayer: formValue.weightMultiplayer!,
        insideCoverPrice: formValue.insideCoverPrice!,
      };
      
      if (this.data.defaultValue?.id) {
        (categoryData as UpdateSizeCategory).id = this.data.defaultValue.id;
      }
      
      this.data.onSubmit(categoryData);
    }
  }

  onClose() {
    this.dialogRef.close();
  }
}

interface Inputs {
  defaultValue?: SizeCategory;
  onClose: () => void;
  onSubmit: (data: CreateSizeCategory | UpdateSizeCategory) => void;
}

