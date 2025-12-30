import {
  Component,
  computed,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from 'src/environments/environment';
import { toSignal } from '@angular/core/rxjs-interop';

interface VerificationStatus {
  email: string;
  isEmailVerified: boolean;
  userType: 'publisher' | 'author' | 'user' | null;
  status: string | null;
  name: string | null;
}

@Component({
  selector: 'app-email-verified',
  imports: [SharedModule, MatButtonModule, MatIconModule],
  templateUrl: './email-verified.html',
  styleUrl: './email-verified.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailVerified {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  // Convert query params to signal
  private queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Record<string, string>,
  });

  // Extract email from query params
  email = computed(() => {
    const params = this.queryParams();
    if (!params) return undefined;
    const email = params['email'];
    return typeof email === 'string' ? email : undefined;
  });

  verificationStatus = signal<VerificationStatus | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Computed signals for derived state
  isPublisher = computed(
    () => this.verificationStatus()?.userType === 'publisher'
  );

  isAuthor = computed(() => this.verificationStatus()?.userType === 'author');

  isPending = computed(() => this.verificationStatus()?.status === 'Pending');

  userName = computed(() => this.verificationStatus()?.name || 'User');

  // Effect to fetch verification status when email changes
  constructor() {
    effect(() => {
      const email = this.email();
      if (email && email.trim()) {
        this.fetchVerificationStatus(email);
      } else {
        this.error.set('Email parameter is missing');
        this.loading.set(false);
      }
    });
  }

  private fetchVerificationStatus(email: string): void {
    this.loading.set(true);
    this.error.set(null);

    const apiUrl = environment.apiUrl || '';
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

    this.http
      .get<VerificationStatus>(
        `${baseUrl}/users/verification-status/${encodeURIComponent(email)}`
      )
      .subscribe({
        next: (status) => {
          this.verificationStatus.set(status);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error fetching verification status:', err);
          // If API call fails, still show success message (email was verified)
          // but without status-specific information
          this.verificationStatus.set({
            email,
            isEmailVerified: true,
            userType: null,
            status: null,
            name: null,
          });
          this.loading.set(false);
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
