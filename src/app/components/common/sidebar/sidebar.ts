import {
  Component,
  EventEmitter,
  Inject,
  OnInit,
  Output,
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
import { UserService } from '../../../services/user';

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
    private observer: BreakpointObserver,
    private userService: UserService
  ) {
    this.isSidemenuOpen = layoutService.isSidemenuOpen$;
    this.showHeader = layoutService.showHeader$;
  }
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isSidemenuOpen!: Signal<boolean>;
  showHeader!: Signal<boolean>;

  mode: 'side' | 'over' = 'side';
  @Output() closeSidebar = new EventEmitter<void>();

  onItemClick() {
    this.closeSidebar.emit();
  }
  sidebarMenu() {
    const menuItems = [
      { name: 'Dashboard', url: '/dashboard', icon: 'dashboard' },
      { name: 'Publishers', url: '/publisher', icon: 'people' },
      { name: 'Authors', url: '/author', icon: 'edit' },
      { name: 'Titles', url: '/titles', icon: 'library_books' },
      { name: 'ISBN', url: '/isbn', icon: 'qr_code' },
      { name: 'Royalties', url: '/royalties', icon: 'attach_money' },
      { name: 'Bookings', url: '/bookings', icon: 'book_online' },
      { name: 'Transactions', url: '/transactions', icon: 'receipt_long' },
      { name: 'Payouts', url: '/payouts', icon: 'credit_card' },
      { name: 'Wallet', url: '/wallet', icon: 'credit_card' },
      { name: 'coupon', url: '/coupon', icon: 'local_offer' },
      { name: 'Settings', url: '/settings', icon: 'settings' },
    ];

    const loggedInUser = this.userService.loggedInUser$();
    const accessLevel = loggedInUser?.accessLevel;

    // Filter menu items based on access level
    return menuItems.filter((item) => {
      // Hide Authors and Publishers links for author role (only show for publisher and superadmin)
      if (accessLevel === 'AUTHER') {
        if (item.name === 'Authors' || item.name === 'Publishers') {
          return false;
        }
      }
      // Hide Wallet for superadmin
      if (accessLevel === 'SUPERADMIN' && item.name === 'Wallet') {
        return false;
      }
      // Hide Payouts for publisher and author (only show for superadmin)
      if (
        (accessLevel === 'PUBLISHER' || accessLevel === 'AUTHER') &&
        item.name === 'Payouts'
      ) {
        return false;
      }
      // Hide Transactions for non-superadmin (only show for superadmin)
      if (accessLevel !== 'SUPERADMIN' && item.name === 'Transactions') {
        return false;
      }
      // Hide Bookings for non-superadmin (only show for superadmin)
      if (accessLevel !== 'SUPERADMIN' && item.name === 'Bookings') {
        return false;
      }
      if (
        (accessLevel === 'AUTHER' || accessLevel === 'PUBLISHER') &&
        item.name === 'Settings'
      ) {
        return false;
      }
      if (accessLevel === 'AUTHER' && item.name === 'ISBN') {
        return false;
      }
      return true;
    });
  }
  ngOnInit(): void {
    //   {
    //     name: 'dashboard',
    //     url: '/dashboard',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'publishers',
    //     url: '/publisher',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'authors',
    //     url: '/author',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'titles',
    //     url: '/titles',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'isbn',
    //     url: '/isbn',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'royalties',
    //     url: '/royalties',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'bookings',
    //     url: '/bookings',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'transactions',
    //     url: '/transactions',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'payouts',
    //     url: '/payouts',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'profile',
    //     url: '/profile',
    //     icon: 'images/house-solid-full.svg',
    //   },
    //   {
    //     name: 'settings',
    //     url: '/settings',
    //     icon: 'images/house-solid-full.svg',
    //   },
    // ]);
    // this.observer.observe(['(max-width: 800px)']).subscribe((res) => {
    //   if (res.matches) {
    //     this.mode = 'over';
    //     this.sidenav?.close();
    //   } else {
    //     this.mode = 'side';
    //     this.sidenav?.open();
    //   }
    // });
  }
  onMenuClick(item: any) {
    this.layoutService.setPageTitle(item.name, item.icon);
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
