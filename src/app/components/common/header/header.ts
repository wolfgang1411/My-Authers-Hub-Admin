import { Component, computed, OnInit, Signal } from '@angular/core';
import { SharedModule } from '../../../modules/shared/shared-module';
import { LayoutService } from '../../../services/layout';
import { UserService } from '../../../services/user';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { NotificationService } from '../../../services/notifications';
import { MyNotification } from '../../../interfaces';
import { Notification } from '../notification/notification';
@Component({
  selector: 'app-header',
  imports: [
    SharedModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatButtonModule,
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

  ngOnInit(): void {}

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
