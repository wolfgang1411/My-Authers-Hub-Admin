import { Component, effect, signal } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { AuthService } from './services/auth';
import { UserService } from './services/user';
import { Layout } from './components/common/layout/layout';
import { SharedModule } from './modules/shared/shared-module';
import { LayoutService } from './services/layout';
import { Loader } from './components/loader/loader';
import { NotificationService } from './services/notifications';
import { StaticValuesService } from './services/static-values';
import { PlatformService } from './services/platform';

@Component({
  selector: 'app-root',
  imports: [RouterModule, SharedModule, Layout, Loader],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'site';
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private layoutService: LayoutService,
    router: Router,
    private notificationService: NotificationService,
    private staticValuesService: StaticValuesService,
    private platformService: PlatformService
  ) {
    // hydrateToken is now called after auth is initialized synchronously
    // This prevents guards from blocking navigation
    this.hydrateToken();
    router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.setPageMeta(ev.url);
        this.setHeaderVisibility(ev.url);
        this.setSidebarVisibility(ev.url);
      }
    });
  }

  ngOnInit(): void {}

  authEffect = effect(
    () => {
      if (this.authService.isUserAuthenticated$()) {
        this.setSidebarVisibility(window.location.pathname);
        this.setHeaderVisibility(window.location.pathname);

        const token = this.authService.getAuthToken().access_token;
        if (token) {
          this.staticValuesService.fetchAndUpdateStaticValues();
          this.platformService.fetchPlatforms();
          this.notificationService.fetchInitialNotifications({
            popupSuperadmin: false,
            itemsPerPage: this.notificationService.itemsPerPage(),
            page: 1,
          });
          this.notificationService.listenToNotifications(token);
        }
      } else {
        this.layoutService.changeHeaderVisibility(false);
        this.layoutService.changeSidebarVisibility(false);
      }
    },
    { allowSignalWrites: true }
  );

  async hydrateToken() {
    try {
      // Auth state is already initialized synchronously in AuthService constructor
      // Now we just verify the token is still valid via API call
      const authResponse = this.authService.getAuthToken();
      if (!authResponse.access_token) {
        // Token was already cleared in initializeAuthFromStorage
        return;
      }

      // Verify token is still valid by calling whoAmI
      // If this fails, we'll clear the auth state
      const user = await this.authService.whoAmI();

      if (!user) {
        this.authService.setAuthToken();
        return;
      }

      // Token is valid, set the user
      this.userService.setLoggedInUser(user);
    } catch (error) {
      // Token verification failed, clear auth state
      console.log('Token verification failed:', error);
      this.authService.setAuthToken();
    }
  }

  setPageMeta(url: string) {}

  setHeaderVisibility(url: string) {
    const isAuthenticated = this.authService.isUserAuthenticated$();
    const isShowHeader = !url.includes('login') && !!isAuthenticated;
    this.layoutService.changeHeaderVisibility(isShowHeader);
  }

  setSidebarVisibility(url: string) {
    const isAuthenticated = this.authService.isUserAuthenticated$();
    // Hide sidebar for login and public invite routes (like /author/invite/:token or /publisher/invite/:token)
    // But show it for admin invites page (/invites)
    const isPublicInviteRoute =
      url.includes('/author/invite/') ||
      url.includes('/publisher/invite/') ||
      (url.includes('/invite/') && !url.startsWith('/invites'));
    const isShowSidebar =
      !url.includes('login') && !isPublicInviteRoute && !!isAuthenticated;
    this.layoutService.changeSidebarVisibility(isShowSidebar);
  }
}
