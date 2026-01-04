import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user';
import { UserAccessLevel } from '../interfaces/StaticValue';

export const superadminGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const router = inject(Router);

  const user = userService.loggedInUser$();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.accessLevel !== UserAccessLevel.SUPERADMIN) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

