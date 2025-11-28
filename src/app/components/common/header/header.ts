import { Component, computed, OnInit } from '@angular/core';
import { SharedModule } from '../../../modules/shared/shared-module';
import { LayoutService } from '../../../services/layout';
import { UserService } from '../../../services/user';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { Notification } from '../notification/notification';
@Component({
  selector: 'app-header',
  imports: [
    SharedModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
    Notification,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  constructor(
    private layoutService: LayoutService,
    public userService: UserService
  ) {}
  pageTitle: string = '';
  pageIcon: string = 'dashboard';
  ngOnInit() {
    this.layoutService.pageTitle$.subscribe((title) => {
      this.pageTitle = title;
    });
    this.layoutService.pageIcone$.subscribe((icon) => {
      this.pageIcon = icon || 'dashboard';
      console.log(this.pageIcon, icon, 'iconnnnn');
    });
  }

  fullName = computed(() => {
    return (
      (this.userService.loggedInUser$()?.firstName || 'Guest') +
      ' ' +
      (this.userService.loggedInUser$()?.lastName || '')
    );
  });

  onSidebarToggle() {
    this.layoutService.toggleSidemenu();
  }
}
