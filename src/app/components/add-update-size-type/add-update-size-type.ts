import { Component, inject } from '@angular/core';
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
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BookBindings, SizeCategory, UpdateSizeType } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-add-update-size-type',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogTitle,
  ],
  templateUrl: './add-update-size-type.html',
  styleUrl: './add-update-size-type.css',
})
export class AddUpdateSizeType {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    id: new FormControl<number | null | undefined>(null),
    width: new FormControl<number | null>(null, [Validators.required]),
    length: new FormControl<number | null>(null, [Validators.required]),
    weightMultiplayer: new FormControl<number | null>(null, [
      Validators.required,
    ]),
    packetPrice: new FormControl<number | null>(null, [Validators.required]),
    type: new FormControl<string | null>(null, [Validators.required]),
    insideCoverPrice: new FormControl<number | null>(null, [Validators.required]),
  });

  ngOnInit(): void {
    if (this.data.defaultValue) {
      this.updateValue(this.data.defaultValue);
    }

    this.form.controls.id.valueChanges.subscribe((v) => {
      this.updateValue(
        this.data.sizeTypes.filter(({ id }) => id === Number(v))[0]
      );
    });
  }

  updateValue(data?: SizeCategory) {
    // Prioritize nested sizeCategory values since we're updating size-category
    const sizeCategoryData = data?.sizeCategory;
    this.form.patchValue(
      {
        id: sizeCategoryData?.id ?? data?.id,
        length: data?.length,
        packetPrice: sizeCategoryData?.packetPrice ?? data?.packetPrice ?? 0,
        type: data?.type || sizeCategoryData?.category || 'A',
        width: data?.width,
        weightMultiplayer: sizeCategoryData?.weightMultiplayer ?? data?.weightMultiplayer ?? 1,
        insideCoverPrice: sizeCategoryData?.insideCoverPrice ?? data?.insideCoverPrice ?? 0,
      },
      { emitEvent: false }
    );
  }

  onSubmit() {
    if (this.form.valid) {
      this.data.onSubmit({
        id: this.form.controls.id.value as number,
        length: Number(this.form.controls.length.value) as number,
        width: Number(this.form.controls.width.value) as number,
        packetPrice: this.form.controls.packetPrice.value as number,
        type: this.form.controls.type.value || 'A',
        weightMultiplayer: this.form.controls.weightMultiplayer.value as number,
        insideCoverPrice: this.form.controls.insideCoverPrice.value as number,
      });
    }
  }
}

interface Inputs {
  sizeTypes: SizeCategory[];
  defaultValue?: SizeCategory;
  onClose: () => void;
  onSubmit: (data: UpdateSizeType) => void;
}
