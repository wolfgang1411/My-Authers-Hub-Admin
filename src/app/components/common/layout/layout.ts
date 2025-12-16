import {
  Component,
  effect,
  HostListener,
  inject,
  signal,
  Signal,
  ViewChild,
} from '@angular/core';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../../services/layout';
import { Footer } from '../footer/footer';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, Sidebar, Header, Footer, MatSidenavModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  constructor(layoutService: LayoutService) {
    this.showHeader = layoutService.showHeader$;
    this.showSidebar = layoutService.showSidebar$;
  }

  showHeader!: Signal<boolean>;
  showSidebar!: Signal<boolean>;
  isMobile = signal(window.innerWidth < 1024);
  mobileSidebarOpen = signal(false);

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
