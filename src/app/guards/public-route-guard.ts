import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take, of } from 'rxjs';
import { AuthService } from '../services/auth';

export const publicRouteGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check current value synchronously first - this handles the case where
  // hydration is already complete and user is navigating
  const currentAuthState = authService.isUserAuthenticated$();
  
  if (currentAuthState !== null) {
    // Auth state is already determined, return immediately as Observable
    // Using of() ensures immediate emission without any delay
    if (currentAuthState) {
      router.navigate(['/']);
      return of(false);
    } else {
      return of(true);
    }
  }

  // Only subscribe to changes if auth state is null (initial load case)
  return toObservable(authService.isUserAuthenticated$).pipe(
    filter((value) => value !== null),
    take(1),
    map((isUserAuthenticated) => {
      if (isUserAuthenticated) {
        router.navigate(['/']);
        return false;
      } else {
        return true;
      }
    })
  );
};
