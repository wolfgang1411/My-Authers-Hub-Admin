import { Component, computed, Signal } from '@angular/core';
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { NotificationService } from '../../../services/notifications';
import { MyNotification, User } from '../../../interfaces';
import { UserService } from '../../../services/user';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-notification',
  imports: [
    SharedModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    RouterModule,
  ],
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class Notification {
  constructor(
    private notificationService: NotificationService,
    userService: UserService
  ) {
    this.notifications = notificationService.notifications;
    this.loggedInUser = userService.loggedInUser$;
  }

  loggedInUser!: Signal<User | null>;

  notifications!: Signal<MyNotification[]>;

  unreadNotifications = computed(() => {
    const notifications = this.notifications();
    return notifications.filter(
      ({ markAsReadByUser }) =>
        !markAsReadByUser.includes(this.loggedInUser()?.id || 0)
    );
  });

  async onNotificationClose() {
    const user = this.loggedInUser();
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
