import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-change-password',
  imports: [
    SharedModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatIconButton,
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePassword implements OnInit {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  showPassword = signal(false);
  showConfirmPassword = signal(false);

  form = new FormGroup({
    password: new FormControl<string | null>(null, [
      Validators.required,
      Validators.minLength(8),
    ]),
    confirmPassword: new FormControl(null, [
      Validators.required,
      Validators.minLength(8),
    ]),
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.validateBothPasswords());
  }

  toggleShowPassword() {
    this.showPassword.update((sp) => !sp);
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword.update((scp) => !scp);
  }

  validateBothPasswords() {
    const password = this.form.controls.password.value as string | null;
    const confirmPassword = this.form.controls.confirmPassword.value as
      | string
      | null;
    let errors = this.form.controls.confirmPassword.errors;
    const isMatch = password?.trim() === confirmPassword?.trim();

    if (isMatch && errors) {
      delete errors['missmatch'];
    } else if (!isMatch) {
      if (!errors) {
        errors = {};
      }
      errors['missmatch'] = 'passwordmismatcherror';
    }
    this.form.controls.confirmPassword.setErrors(errors);
  }

  onSubmit() {
    if (this.form.valid) {
      this.data.onSubmit(this.form.value.password as string);
    }
  }
}

interface Inputs {
  onClose: () => void;
  onSubmit: (password: string) => void;
}
