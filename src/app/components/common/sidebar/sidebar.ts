import {
  Component,
  Inject,
  OnInit,
  Signal,
  signal,
  ViewChild,
} from '@angular/core';
import { SharedModule } from '../../../modules/shared/shared-module';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../../services/layout';
import { SideMenu } from '../../../interfaces';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { BreakpointObserver, LayoutModule } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-sidebar',
  imports: [
    SharedModule,
    RouterModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    LayoutModule,
    MatButtonModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  constructor(
    private layoutService: LayoutService,
    @Inject(AuthService) private authService: AuthService,
    private observer: BreakpointObserver
  ) {
    this.isSidemenuOpen = layoutService.isSidemenuOpen$;
    this.showHeader = layoutService.showHeader$;
  }
  @ViewChild('sidenav') sidenav!: MatSidenav;
  sidebarMenu = signal<SideMenu[]>([]);
  isSidemenuOpen!: Signal<boolean>;
  showHeader!: Signal<boolean>;

  mode: 'side' | 'over' = 'side';

  ngOnInit(): void {
    this.sidebarMenu.set([
      {
        name: 'dashboard',
        url: '/dashboard',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'publishers',
        url: '/publisher',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'authors',
        url: '/author',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'titles',
        url: '/titles',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'isbn',
        url: '/isbn',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'royalties',
        url: '/royalties',
        icon: 'images/house-solid-full.svg',
      },

      {
        name: 'bookings',
        url: '/bookings',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'transactions',
        url: '/transactions',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'payouts',
        url: '/payouts',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'profile',
        url: '/profile',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'settings',
        url: '/settings',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'notifications',
        url: '/notifications',
        icon: 'images/bell-solid-full.svg',
      },
    ]);
    this.observer.observe(['(max-width: 800px)']).subscribe((res) => {
      if (res.matches) {
        this.mode = 'over';
        this.sidenav?.close();
      } else {
        this.mode = 'side';
        this.sidenav?.open();
      }
    });
  }

  onToggleSidebar() {
    this.layoutService.toggleSidemenu();
    this.sidenav.toggle();
  }
  onMenuItemClick(): void {
    if (window.innerWidth < 768) {
      this.layoutService.toggleSidemenu(); // auto-close on mobile
    }
  }
  onLogout(): void {
    console.log('logoutesjent');
    this.authService.logout();
  }
}
