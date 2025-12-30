import { Component, effect, signal, inject } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth';
import { UserService } from './services/user';
import { Layout } from './components/common/layout/layout';
import { SharedModule } from './modules/shared/shared-module';
import { LayoutService } from './services/layout';
import { Loader } from './components/loader/loader';
import { NotificationService } from './services/notifications';
import { StaticValuesService } from './services/static-values';
import { PlatformService } from './services/platform';
import { SEOService } from './services/seo';
import { RouteSEOData } from './interfaces/SEO';

@Component({
  selector: 'app-root',
  imports: [RouterModule, SharedModule, Layout, Loader],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'site';
  private readonly seoService = inject(SEOService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private layoutService: LayoutService,
    private notificationService: NotificationService,
    private staticValuesService: StaticValuesService,
    private platformService: PlatformService
  ) {
    // hydrateToken is now called after auth is initialized synchronously
    // This prevents guards from blocking navigation
    this.hydrateToken();
    this.router.events
      .pipe(filter((ev) => ev instanceof NavigationEnd))
      .subscribe(() => {
        this.setPageMeta();
        this.setHeaderVisibility(this.router.url);
        this.setSidebarVisibility(this.router.url);
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

  setPageMeta(): void {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const seoData = route.snapshot.data['seo'] as RouteSEOData | undefined;

    if (seoData) {
      const title = typeof seoData.title === 'function'
        ? seoData.title(route.snapshot)
        : seoData.title;

      const description = seoData.description
        ? typeof seoData.description === 'function'
          ? seoData.description(route.snapshot)
          : seoData.description
        : undefined;

      const canonicalUrl = seoData.canonicalUrl || this.router.url;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

      this.seoService.updatePageSEO({
        title,
        description,
        keywords: seoData.keywords,
        ogTitle: title,
        ogDescription: description,
        ogImage: seoData.ogImage,
        ogUrl: baseUrl ? `${baseUrl}${canonicalUrl}` : undefined,
        ogType: seoData.ogType || 'website',
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: seoData.ogImage,
        canonicalUrl,
        noindex: seoData.noindex,
        nofollow: seoData.nofollow,
      });
    } else {
      // Default SEO for routes without configuration
      this.seoService.setTitle('My Authors Hub');
    }
  }

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
