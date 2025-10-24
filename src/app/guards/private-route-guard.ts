import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const privateRouteGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isUserAuthenticated = authService.isUserAuthenticated$();

  console.log({ isUserAuthenticated });

  if (isUserAuthenticated) {
    return true;
  }

  if (isUserAuthenticated === null) {
    router.navigate(['/waiting'], {
      state: {
        redirectUrl: state.url,
      },
    });
    return false;
  }

  if (isUserAuthenticated === false) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
