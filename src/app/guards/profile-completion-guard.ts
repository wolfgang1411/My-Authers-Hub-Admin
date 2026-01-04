import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take, switchMap, of } from 'rxjs';
import { UserService } from '../services/user';
import { AuthService } from '../services/auth';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

export const profileCompletionGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const translateService = inject(TranslateService);

  // Check if user is authenticated first
  const currentAuthState = authService.isUserAuthenticated$();
  
  if (currentAuthState === null) {
    // Wait for auth state to be determined
    return toObservable(authService.isUserAuthenticated$).pipe(
      filter((value) => value !== null),
      take(1),
      switchMap((isUserAuthenticated) => {
        if (!isUserAuthenticated) {
          router.navigate(['/login']);
          return of(false);
        }
        return waitForUserAndCheckProfile(userService, router, translateService, state.url);
      })
    );
  }

  if (!currentAuthState) {
    router.navigate(['/login']);
    return false;
  }

  // Wait for user to be loaded, then check profile
  return waitForUserAndCheckProfile(userService, router, translateService, state.url);
};

function waitForUserAndCheckProfile(
  userService: UserService,
  router: Router,
  translateService: TranslateService,
  currentUrl: string
) {
  const currentUser = userService.loggedInUser$();

  // If user is already loaded, check immediately
  if (currentUser) {
    return of(checkProfileCompletion(userService, router, translateService, currentUrl));
  }

  // Wait for user to be loaded (it should load quickly after authentication)
  return toObservable(userService.loggedInUser$).pipe(
    filter((user) => user !== null),
    take(1),
    map((user) => {
      return checkProfileCompletion(userService, router, translateService, currentUrl);
    })
  );
}

function checkProfileCompletion(
  userService: UserService,
  router: Router,
  translateService: TranslateService,
  currentUrl: string
): boolean {
  const user = userService.loggedInUser$();

  // If user is not loaded yet, allow navigation (should not happen as we wait above)
  if (!user) {
    return true;
  }

  // Allow navigation to profile editing routes (author/:id and publisher/:id)
  // Also allow invitation routes
  if (
    currentUrl.match(/\/author\/\d+$/) || 
    currentUrl.match(/\/publisher\/\d+$/) ||
    currentUrl.includes('/author/invite/') ||
    currentUrl.includes('/publisher/invite/')
  ) {
    return true;
  }

  // Only check for authors and publishers, not superadmins or regular users
  const accessLevel = user.accessLevel;
  if (accessLevel !== 'AUTHER' && accessLevel !== 'PUBLISHER') {
    return true;
  }

  // Check what's missing and get the tab index to redirect to
  const missingInfo = getMissingProfileInfo(user);
  
  if (missingInfo.missingCount > 0) {
    // Determine the redirect route based on user type
    const redirectRoute = accessLevel === 'AUTHER' && user.auther?.id
      ? `/author/${user.auther.id}`
      : accessLevel === 'PUBLISHER' && user.publisher?.id
        ? `/publisher/${user.publisher.id}`
        : '/dashboard';

    // Determine which tab to redirect to based on what's missing
    // Priority: Media/Basic Details (tab 0) > Address (tab 1) > Bank (tab 2)
    let tabIndex = 0; // Default to first tab (Basic Details with Media)
    
    if (missingInfo.missingMedia || missingInfo.missingBasicDetails) {
      tabIndex = 0; // Basic Details tab (for media and basic info)
    } else if (missingInfo.missingAddress) {
      tabIndex = 1; // Address tab
    } else if (missingInfo.missingBank) {
      tabIndex = 2; // Bank Details tab
    }

    // Check if we're already on the profile page with the correct tab
    const isOnProfilePage = currentUrl.match(/\/author\/\d+/) || currentUrl.match(/\/publisher\/\d+/);
    const urlParams = new URLSearchParams(currentUrl.split('?')[1] || '');
    const currentTabParam = urlParams.get('tab');
    const currentTab = currentTabParam ? Number(currentTabParam) : 0;
    const isOnCorrectTab = isOnProfilePage && currentTab === tabIndex;

    // Only redirect if not already on the correct tab of the profile page
    if (!isOnCorrectTab && redirectRoute !== '/dashboard') {

      // Show a nice message about completing profile with specific missing items
      const missingItems: string[] = [];
      if (missingInfo.missingMedia) {
        missingItems.push(translateService.instant('profileImage') || 'profile image');
      }
      if (missingInfo.missingBasicDetails) {
        missingItems.push(translateService.instant('basicDetails') || 'basic details');
      }
      if (missingInfo.missingAddress) {
        missingItems.push(translateService.instant('address') || 'address');
      }
      if (missingInfo.missingBank) {
        missingItems.push(translateService.instant('bankdetails') || 'bank details');
      }

      const missingItemsText = missingItems.length > 0
        ? missingItems.join(', ')
        : translateService.instant('requiredInformation') || 'required information';

      const message = missingItems.length === 1
        ? translateService.instant('completeYourProfileMessageSingle')?.replace('{item}', missingItemsText) 
          || `Please complete your profile. You need to add ${missingItemsText}.`
        : translateService.instant('completeYourProfileMessageMultiple')?.replace('{items}', missingItemsText)
          || `Please complete your profile. You need to add the following: ${missingItemsText}.`;

      setTimeout(() => {
        Swal.fire({
          icon: 'info',
          title: translateService.instant('completeYourProfile'),
          html: message,
          confirmButtonText: translateService.instant('completeProfile'),
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then(() => {
          router.navigate([redirectRoute], { 
            queryParams: { tab: tabIndex }
          });
        });
      }, 100);
    }
    return false;
  }

  return true;
}

interface MissingProfileInfo {
  missingMedia: boolean;
  missingBasicDetails: boolean;
  missingAddress: boolean;
  missingBank: boolean;
  missingCount: number;
}

function getMissingProfileInfo(user: any): MissingProfileInfo {
  const accessLevel = user.accessLevel;
  const result: MissingProfileInfo = {
    missingMedia: false,
    missingBasicDetails: false,
    missingAddress: false,
    missingBank: false,
    missingCount: 0,
  };

  if (accessLevel === 'AUTHER' && user.auther) {
    const author = user.auther;
    result.missingMedia = !(author.medias && Array.isArray(author.medias) && author.medias.length > 0);
    result.missingBasicDetails = !(
      author.user?.email && 
      author.user?.phoneNumber &&
      author.username
    );
    result.missingAddress = !(author.address && Array.isArray(author.address) && author.address.length > 0);
    result.missingBank = !(author.bankDetails && Array.isArray(author.bankDetails) && author.bankDetails.length > 0);
  } else if (accessLevel === 'PUBLISHER' && user.publisher) {
    const publisher = user.publisher;
    result.missingMedia = !(publisher.medias && Array.isArray(publisher.medias) && publisher.medias.length > 0);
    // username is optional for publishers, only check name and email
    result.missingBasicDetails = !(
      publisher.name && 
      publisher.email
    );
    result.missingAddress = !(publisher.address && Array.isArray(publisher.address) && publisher.address.length > 0);
    result.missingBank = !(publisher.bankDetails && Array.isArray(publisher.bankDetails) && publisher.bankDetails.length > 0);
  }

  result.missingCount = [
    result.missingMedia,
    result.missingBasicDetails,
    result.missingAddress,
    result.missingBank,
  ].filter(Boolean).length;

  return result;
}

function isAuthorOrPublisherProfileComplete(user: any): boolean {
  const missingInfo = getMissingProfileInfo(user);
  return missingInfo.missingCount === 0;
}

