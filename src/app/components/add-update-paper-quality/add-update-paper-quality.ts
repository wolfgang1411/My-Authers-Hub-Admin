import { Component, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { PaperQuailty, UpdatePaperQualityType } from '../../interfaces';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-add-update-paper-quality',
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
  templateUrl: './add-update-paper-quality.html',
  styleUrl: './add-update-paper-quality.css',
})
export class AddUpdatePaperQuality implements OnInit {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    id: new FormControl<number | null | undefined>(null),
    name: new FormControl<string | null | undefined>(null, [
      Validators.required,
    ]),
    colorPrice: new FormControl<number | null | undefined>(null, [
      Validators.required,
    ]),
    blackAndWhitePrice: new FormControl<number | null | undefined>(null),
  });

  ngOnInit(): void {
    if (this.data.defaultValue) {
      this.updateValue(this.data.defaultValue);
    }

    this.form.controls.id.valueChanges.subscribe((v) => {
      this.updateValue(
        this.data.paperQualityTypes.filter(({ id }) => id === Number(v))[0]
      );
    });
  }

  updateValue(data?: PaperQuailty) {
    this.form.patchValue(
      {
        id: data?.id,
        blackAndWhitePrice: data?.blackAndWhitePrice,
        colorPrice: data?.colorPrice,
        name: data?.name,
      },
      { emitEvent: false }
    );
  }

  onSubmit() {
    if (this.form.valid) {
      this.data.onSubmit({
        id: this.form.value.id,
        blackAndWhitePrice: this.form.value.blackAndWhitePrice as number,
        colorPrice: this.form.value.colorPrice as number,
        name: this.form.value.name as string,
      });
    }
  }
}

interface Inputs {
  paperQualityTypes: PaperQuailty[];
  defaultValue?: PaperQuailty;
  onClose: () => void;
  onSubmit: (data: UpdatePaperQualityType) => void;
}
