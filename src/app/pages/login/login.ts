import { Component } from '@angular/core';
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
export class Login {
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
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/),
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
  async onFormSubmit() {
    try {
      const authResponse = await this.authService.loginWithEmail({
        username: this.loginForm.value.username,
        password: this.loginForm.value.password as string,
      });
      console.log(this.loginForm.value.password, 'passworddddddd');
      const userId = this.authService.setAuthToken(authResponse);
      if (userId) {
        const user = await this.authService.whoAmI();
        this.userService.setLoggedInUser(user);
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.log(error);
    }
  }
}
