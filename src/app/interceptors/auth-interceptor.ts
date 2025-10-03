import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const { access_token } = authService.getAuthToken();

  if (access_token) {
    req = req.clone({
      ...req,
      setHeaders: {
        Authorization: `Bearer ${access_token}`,
      },
    });
  }

  return next(
    req.clone({
      setHeaders: {
        'ngrok-skip-browser-warning': '69420',
      },
    })
  );
};
