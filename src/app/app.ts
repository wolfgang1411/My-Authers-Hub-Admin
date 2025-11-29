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
      const authResponse = this.authService.getAuthToken();
      if (!authResponse.access_token) {
        this.authService.setAuthToken();
        return;
      }

      const userId = this.authService.setAuthToken(authResponse);
      if (!userId) {
        this.authService.setAuthToken();
        return;
      }

      const user = await this.authService.whoAmI();

      if (!user) {
        this.authService.setAuthToken();
        return;
      }
      this.userService.setLoggedInUser(user);
    } catch (error) {
      console.log(error);
    }
  }

  setPageMeta(url: string) {}

  setHeaderVisibility(url: string) {
    const isAuthenticated = this.authService.isUserAuthenticated$();
    const isShowHeader =
      !url.includes('login') &&
      !url.includes('shared-title-view') &&
      !!isAuthenticated;
    this.layoutService.changeHeaderVisibility(isShowHeader);
  }

  setSidebarVisibility(url: string) {
    const isAuthenticated = this.authService.isUserAuthenticated$();
    const isShowSidebar =
      !url.includes('login') &&
      !url.includes('invite') &&
      !url.includes('shared-title-view') &&
      !!isAuthenticated;
    this.layoutService.changeSidebarVisibility(isShowSidebar);
  }
}
