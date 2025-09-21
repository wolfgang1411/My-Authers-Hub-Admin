import { Component, inject } from '@angular/core';
import { LaminationType, UpdateLaminationType } from '../../interfaces';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-add-update-lamination-type',
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
  templateUrl: './add-update-lamination-type.html',
  styleUrl: './add-update-lamination-type.css',
})
export class AddUpdateLaminationType {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    id: new FormControl<number | null | undefined>(null),
    name: new FormControl<string | null | undefined>(null, [
      Validators.required,
    ]),
    price: new FormControl<number | null | undefined>(null, [
      Validators.required,
    ]),
  });

  ngOnInit(): void {
    if (this.data.defaultValue) {
      this.updateValue(this.data.defaultValue);
    }

    this.form.controls.id.valueChanges.subscribe((v) => {
      this.updateValue(
        this.data.laminationTypes.filter(({ id }) => id === Number(v))[0]
      );
    });
  }

  updateValue(data?: LaminationType) {
    this.form.patchValue(
      {
        id: data?.id,
        name: data?.name,
        price: data?.price,
      },
      { emitEvent: false }
    );
  }

  onSubmit() {
    if (this.form.valid) {
      this.data.onSubmit({
        id: this.form.value.id,
        name: this.form.value.name as string,
        price: this.form.value.price as number,
      });
    }
  }
}

interface Inputs {
  laminationTypes: LaminationType[];
  defaultValue?: LaminationType;
  onClose: () => void;
  onSubmit: (data: UpdateLaminationType) => void;
}
