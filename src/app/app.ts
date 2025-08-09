import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from './services/auth';
import { UserService } from './services/user';
import { Layout } from './components/common/layout/layout';
import { SharedModule } from './modules/shared/shared-module';
import { LayoutService } from './services/layout';

@Component({
  selector: 'app-root',
  imports: [RouterModule, SharedModule, Layout],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'site';
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private layoutService: LayoutService,
    router: Router
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
    const isShowHeader = !url.includes('login');
    this.layoutService.changeHeaderVisibility(isShowHeader);
  }

  setSidebarVisibility(url: string) {
    const isShowSidebar = !url.includes('login');
    this.layoutService.changeSidebarVisibility(isShowSidebar);
  }
}
