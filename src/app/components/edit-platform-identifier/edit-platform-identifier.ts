import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-edit-platform-identifier',
  imports: [
    MatDialogModule,
    SharedModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './edit-platform-identifier.html',
  styleUrl: './edit-platform-identifier.css',
})
export class EditPlatformIdentifier implements OnInit {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    distributionLink: new FormControl<string | null>(
      this.data.distributionLink || null
    ),
  });

  ngOnInit(): void {
    // Form is already initialized with data
  }

  onSubmit() {
    if (!this.form.valid) {
      return;
    }

    this.data.onSubmit({
      distributionLink: this.form.value.distributionLink?.trim() || undefined,
    });
  }
}

interface Inputs {
  onSubmit: (data: {
    distributionLink?: string;
  }) => void;
  onClose: () => void;
  platformName: string;
  distributionLink?: string;
}

