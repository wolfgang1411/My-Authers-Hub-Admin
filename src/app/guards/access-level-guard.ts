import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserService } from '../services/user';

export const accessLevelGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  const accessLevels = route.data['accessLevels'] as string[];

  if (!accessLevels.length) {
    return true;
  }

  const isUserAuthenticated = authService.isUserAuthenticated$();

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
