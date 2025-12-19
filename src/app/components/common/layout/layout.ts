import {
  Component,
  computed,
  HostListener,
  inject,
  signal,
  Signal,
  ViewChild,
} from '@angular/core';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { CommonModule, NgClass } from '@angular/common';
import { LayoutService } from '../../../services/layout';
import { Footer } from '../footer/footer';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SimpleHeader } from '../simple-header/simple-header';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    NgClass,
    Sidebar,
    Header,
    Footer,
    MatSidenavModule,
    SimpleHeader,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  constructor(
    layoutService: LayoutService,
    private router: Router,
    private authService: AuthService
  ) {
    this.showHeader = layoutService.showHeader$;
    this.showSidebar = layoutService.showSidebar$;

    // Track current route for simple header
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute.set(event.url);
      });

    this.currentRoute.set(this.router.url);
  }

  showHeader!: Signal<boolean>;
  showSidebar!: Signal<boolean>;
  isMobile = signal(window.innerWidth < 1024);
  mobileSidebarOpen = signal(false);
  currentRoute = signal<string>('');

  // Static pages that should show simple header when not authenticated
  staticPages = ['/contact', '/faq', '/terms', '/user-policies'];

  shouldShowSimpleHeader = computed(() => {
    const isAuthenticated = this.authService.isUserAuthenticated$();
    const route = this.currentRoute();
    const isStaticPage = this.staticPages.some((page) => route.includes(page));

    return !isAuthenticated && isStaticPage;
  });

  @HostListener('window:resize')
  onResize() {
    const mobile = window.innerWidth < 1024;
    this.isMobile.set(mobile);

    // when switching to desktop → reset mobile state
    if (!mobile) {
      this.mobileSidebarOpen.set(false);
    }
  }

  toggleMobileSidebar() {
    if (this.isMobile()) {
      this.mobileSidebarOpen.update((v) => !v);
    }
  }

  closeMobileSidebar() {
    if (this.isMobile()) {
      this.mobileSidebarOpen.set(false);
    }
  }
}
