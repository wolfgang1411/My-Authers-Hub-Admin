import {
  Component,
  DestroyRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { NgOtpInputComponent, NgOtpInputModule } from 'ng-otp-input';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import md5 from 'md5';
import { MatIconModule } from '@angular/material/icon';
import { Logger } from 'src/app/services/logger';
import {
  interval,
  map,
  Subject,
  switchMap,
  takeUntil,
  takeWhile,
  timeout,
  timer,
} from 'rxjs';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-verify-password',
  imports: [
    NgOtpInputModule,
    ReactiveFormsModule,
    SharedModule,
    RouterLink,
    MatIconModule,
  ],
  templateUrl: './verify-password.html',
  styleUrl: './verify-password.css',
})
export class VerifyPassword {
  private destroyRef = inject(DestroyRef);
  loading = signal(false);
  logger = inject(Logger);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  otpId: string | null = null;
  email: string | null = null;
  showNewPassword = false;
  showConfirmPassword = false;

  private reset$ = new Subject<void>();
  countdown$ = toSignal(
    this.reset$.pipe(
      switchMap(() =>
        timer(0, 1000).pipe(
          map((i) => 30 - i),
          takeWhile((sec) => sec >= 0),
        ),
      ),
      takeUntilDestroyed(this.destroyRef),
    ),
    { initialValue: 30 },
  );

  isDisabled$ = toSignal(
    toObservable(this.countdown$).pipe(map((sec) => (sec || 0) > 0)),
  );

  otpValue = signal('');
  otpConfig = {
    length: 6,
    allowNumbersOnly: true,
  };
  @ViewChild(NgOtpInputComponent) otpInput!: NgOtpInputComponent;

  passwordMatchValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const password = control.get('newPassword')?.value;
    const confirm = control.get('confirmPassword')?.value;

    if (!password || !confirm) return null;

    return password === confirm ? null : { passwordMismatch: true };
  };
  passwordForm = new FormGroup(
    {
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/),
      ]),
      confirmPassword: new FormControl('', Validators.required),
    },
    { validators: this.passwordMatchValidator },
  );

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private router: Router,
  ) {
    this.reset$.next();
  }

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

    if (!this.otpValue()) {
      this.errorMessage.set('Please enter the OTP.');
      return;
    }
    if (this.otpValue().length !== 6) {
      this.errorMessage.set('OTP must be 6 digits.');
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
        'Password updated successfully. Redirecting to login...',
      );

      this.router.navigate(['/login'], {
        queryParams: { prefill: this.email || '' },
      });
    } catch (err: any) {
      this.errorMessage.set(
        this.logger.parseError(err).message ||
          'Failed to update password. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  resendOtp = async () => {
    console.log(this.otpValue(), 'resend ');
    if (!this.email) {
      this.errorMessage.set('No email to resend to. Start again.');
      return;
    }
    this.otpValue.set('');
    this.passwordForm.reset();
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.loading.set(true);
    this.otpInput?.setValue('');

    try {
      const res = await this.auth.requestPasswordReset(this.email);
      this.otpId = res?.id || this.otpId;
      this.reset$.next();

      this.successMessage.set('OTP resent successfully.');
    } catch (err: any) {
      this.errorMessage.set(
        this.logger.parseError(err).message || 'Could not resend OTP.',
      );
    } finally {
      this.loading.set(false);
    }
  };
}
