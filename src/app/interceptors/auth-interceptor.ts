import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, from, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const { access_token } = authService.getAuthToken();

  if (access_token && req.url.includes(environment.apiUrl)) {
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
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Check if token exists and is expired
        const { access_token } = authService.getAuthToken();
        if (access_token) {
          const tokenInfo = authService.decodeToken(access_token);
          if (tokenInfo && tokenInfo.exp < Date.now() / 1000) {
            // Token is expired, show logout message and redirect
            return from(
              Swal.fire({
                icon: 'warning',
                title: 'Session Expired',
                text: 'You have been logged out. Please login again to continue.',
                confirmButtonText: 'Login',
                allowOutsideClick: false,
                allowEscapeKey: false,
              })
            ).pipe(
              tap(() => {
                // Clear auth tokens and navigate to login after user clicks
                authService.logout();
              }),
              switchMap(() => {
                // Mark error as handled to prevent other error handlers from showing Swal
                (error as any).__handledByInterceptor = true;
                // Throw error after Swal completes and user clicks
                return throwError(() => error);
              })
            );
          }
        }
        // 401 but token is not expired (might be invalid credentials or other auth issue)
        // Let other error handlers process it normally
      }
      return throwError(() => error);
    })
  );
};
