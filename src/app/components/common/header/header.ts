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
@Component({
  selector: 'app-header',
  imports: [
    SharedModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatButtonModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  constructor(
    private layoutService: LayoutService,
    public userService: UserService,
    private notificationService: NotificationService
  ) {
    this.notifications = notificationService.notifications;
  }

  notifications!: Signal<MyNotification[]>;

  ngOnInit(): void {}

  unreadNotifications = computed(() => {
    const notifications = this.notifications();
    return notifications.filter(
      ({ markAsReadByUser }) =>
        !markAsReadByUser.includes(this.userService.loggedInUser$()?.id || 0)
    );
  });

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

  async onNotificationClose() {
    const user = this.userService.loggedInUser$();
    if (!user) return;

    const unreadNotificaitons = this.notifications()
      .filter(({ markAsReadByUser }) => !markAsReadByUser.includes(user?.id))
      .map(({ id }) => id);

    if (!unreadNotificaitons.length) return;

    await this.notificationService.markAsViewed(unreadNotificaitons);

    this.notificationService.notifications.update((notifications) => {
      return notifications.map((notification) => {
        if (unreadNotificaitons.includes(notification.id)) {
          notification.markAsReadByUser.push(user.id);
        }

        return notification;
      });
    });
  }
}
