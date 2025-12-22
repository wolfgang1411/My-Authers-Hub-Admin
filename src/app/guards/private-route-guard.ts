import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth';

export const privateRouteGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check current value synchronously first - this handles the case where
  // hydration is already complete and user is navigating
  const currentAuthState = authService.isUserAuthenticated$();

  if (currentAuthState !== null) {
    // Auth state is already determined, return immediately
    if (currentAuthState) {
      return true;
    } else {
      router.navigate(['/login']);
      return false;
    }
  }

  // Only subscribe to changes if auth state is null (initial load case)
  // This prevents unnecessary delays when navigating after hydration is complete
  return toObservable(authService.isUserAuthenticated$).pipe(
    filter((value) => value !== null),
    take(1),
    map((isUserAuthenticated) => {
      if (isUserAuthenticated) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
