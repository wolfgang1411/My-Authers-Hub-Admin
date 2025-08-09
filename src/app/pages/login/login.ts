import { Component } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { UserService } from '../../services/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  loginForm = new FormGroup({
    username: new FormControl(),
    password: new FormControl(),
  });

  async onFormSubmit() {
    try {
      const authResponse = await this.authService.loginWithEmail({
        username: this.loginForm.value.username,
        password: this.loginForm.value.password,
      });
      const userId = this.authService.setAuthToken(authResponse);
      if (userId) {
        const user = await this.authService.whoAmI();
        this.userService.setLoggedInUser(user);
        this.router.navigate(['/']);
      }
      console.log({
        authResponse,
      });
    } catch (error) {
      console.log(error);
    }
  }
}
