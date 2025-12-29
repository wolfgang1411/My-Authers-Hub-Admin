import { Component, AfterViewInit, OnInit } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth';
import { UserService } from '../../services/user';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from 'src/environments/environment';
import { AuthResponse } from 'src/app/interfaces';
import Swal from 'sweetalert2';

declare var google: any;

@Component({
  selector: 'app-login',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatButtonModule,
    RouterLink,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit, OnInit {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  loginForm = new FormGroup({
    username: new FormControl(),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
    ]),
  });
  showPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      const prefill = qp.get('prefill');
      if (prefill) {
        this.loginForm.get('username')?.setValue(prefill);
      }

      // Handle email verification status
      const verified = qp.get('verified');
      if (verified !== null) {
        if (verified === 'true') {
          Swal.fire({
            icon: 'success',
            title: 'Email Verified',
            text: 'Your email has been successfully verified. You can now log in.',
            confirmButtonText: 'OK',
            heightAuto: false,
          });
          // Clean up the query parameter
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { verified: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        } else if (verified === 'false') {
          Swal.fire({
            icon: 'error',
            title: 'Verification Failed',
            text: 'Email verification failed. The link may be invalid or expired. Please contact support if you continue to experience issues.',
            confirmButtonText: 'OK',
            heightAuto: false,
          });
          // Clean up the query parameter
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { verified: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      }
    });
  }

  ngAfterViewInit() {
    // Wait for the view to be fully rendered
    setTimeout(() => {
      google.accounts.id.initialize({
        client_id: environment.O2AuthClientId,
        callback: (response: any) => this.handleCredential(response),
      });

      google.accounts.id.renderButton(document.getElementById('google-btn'), {
        size: 'large',
        theme: 'outline',
      });
    });
  }
  async handleCredential(response: any) {
    const authResponse = await this.authService.googleLogin(
      response.credential
    );
    await this.handleLoggedInResponse(authResponse);
  }

  async handleLoggedInResponse(response: AuthResponse) {
    const userId = this.authService.setAuthToken(response);
    if (userId) {
      const user = await this.authService.whoAmI();
      this.userService.setLoggedInUser(user);
      this.router.navigate(['/']);
    }
  }

  async onFormSubmit() {
    try {
      const authResponse = await this.authService.loginWithEmail({
        username: this.loginForm.value.username,
        password: this.loginForm.value.password as string,
      });
      await this.handleLoggedInResponse(authResponse);
    } catch (error) {
      console.log(error);
    }
  }
}
