import { Component, AfterViewInit } from '@angular/core';
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
export class Login implements AfterViewInit {
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
