import { Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  forgotForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit() {
    if (this.forgotForm.invalid) {
      this.errorMessage.set('Please enter a valid email.');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const email = this.forgotForm.value.email;
      const res = await this.auth.requestPasswordReset(email as string);
      // res expected { logId: string }
      const logId = res?.logId;
      this.successMessage.set('OTP has been sent to your email.');
      // navigate to verify with query params
      this.router.navigate(['/forgot/verify'], {
        queryParams: { otpId: res.logId, email },
      });
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Something went wrong. Try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
