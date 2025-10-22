import { Component, inject, OnInit } from '@angular/core';
import { CreateTitleConfig, Title, TitleConfigType } from '../../interfaces';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-add-title-config',
  imports: [
    SharedModule,
    MatDialogModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
  ],
  templateUrl: './add-title-config.html',
  styleUrl: './add-title-config.css',
})
export class AddTitleConfig {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    type: new FormControl(this.data.type, [Validators.required]),
    titleId: new FormControl<number | null>(null, [Validators.required]),
    position: new FormControl<number | null>(this.data.nextPosition || 1, [
      Validators.required,
    ]),
  });

  onSubmit() {
    if (this.form.valid) {
      this.data.onSubmit(this.form.value as CreateTitleConfig);
    }
  }
}

interface Inputs {
  type: TitleConfigType;
  nextPosition?: number;
  titles: Title[];
  onClose: () => void;
  onSubmit: (data: CreateTitleConfig) => void;
}
