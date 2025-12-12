import { Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { NgOtpInputModule } from 'ng-otp-input';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import md5 from 'md5';

@Component({
  selector: 'app-verify-password',
  imports: [NgOtpInputModule, ReactiveFormsModule, SharedModule, RouterLink],
  templateUrl: './verify-password.html',
  styleUrl: './verify-password.css',
})
export class VerifyPassword {
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  otpId: string | null = null; // 🔥 renamed
  email: string | null = null;

  otpValue = signal('');
  otpConfig = {
    length: 6,
    allowNumbersOnly: true,
  };

  passwordForm = new FormGroup({
    newPassword: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
    ]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      this.otpId = qp.get('otpId'); // 🔥 renamed
      this.email = qp.get('email');
    });
  }

  onOtpChange(value: string) {
    this.otpValue.set(value);
  }

  async onSubmit() {
    this.errorMessage.set(null);

    if (!this.otpId) {
      this.errorMessage.set('Invalid session. Please request a new OTP.');
      return;
    }

    if (this.passwordForm.invalid) {
      this.errorMessage.set('Please fill the password fields correctly.');
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    if (!this.otpValue()) {
      this.errorMessage.set('Please enter the OTP.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.updatePassword({
        logId: Number(this.otpId),
        otp: Number(this.otpValue()),
        newPassword: newPassword ? md5(newPassword) : '',
        confirmPassword: confirmPassword ? md5(confirmPassword) : '',
        requestType: 'CHANGE',
      });

      this.successMessage.set(
        'Password updated successfully. Redirecting to login...'
      );

      this.router.navigate(['/login'], {
        queryParams: { prefill: this.email || '' },
      });
    } catch (err: any) {
      this.errorMessage.set(
        err?.message || 'Failed to update password. Please try again.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  resendOtp = async () => {
    if (!this.email) {
      this.errorMessage.set('No email to resend to. Start again.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const res = await this.auth.requestPasswordReset(this.email);

      // backend returns otpid — so use that
      this.otpId = res?.id || this.otpId;

      this.successMessage.set('OTP resent successfully.');
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Could not resend OTP.');
    } finally {
      this.loading.set(false);
    }
  };
}
