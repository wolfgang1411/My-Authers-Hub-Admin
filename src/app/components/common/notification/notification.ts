import { Component, computed, Signal, ViewChild } from '@angular/core';
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { NotificationService } from '../../../services/notifications';
import { MyNotification, User, NotificationRedirectType } from '../../../interfaces';
import { UserService } from '../../../services/user';
import { Router, RouterModule } from '@angular/router';
import { LoaderService } from '../../../services/loader';
import { combineLatest, map, Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-notification',
  imports: [
    SharedModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    RouterModule,
    MatIconModule,
  ],
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class Notification {
  @ViewChild('notificationMenuTrigger') notificationMenuTrigger!: MatMenuTrigger;

  constructor(
    private loaderService: LoaderService,
    private notificationService: NotificationService,
    userService: UserService,
    private router: Router
  ) {
    this.notifications = notificationService.notifications;
    this.lastPage = notificationService.lastPage;
    this.page = notificationService.page;
    this.loggedInUser = userService.loggedInUser$;
    this.isNotificationLoading$ = this.loaderService.isAreaLoading$(
      'fetch-notifications'
    );
  }

  loggedInUser!: Signal<User | null>;

  page!: Signal<number>;
  lastPage!: Signal<number>;
  notifications!: Signal<MyNotification[]>;

  isNotificationLoading$!: Observable<boolean>;

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

  loadMoreNotifications(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.notificationService.loadMoreNotifications({
      popupSuperadmin: false,
      itemsPerPage: this.notificationService.itemsPerPage(),
    });
  }

  /**
   * Get navigation URL based on redirectType and redirectId
   */
  getNotificationUrl(notification: MyNotification): string | null {
    const { redirectType, redirectId } = notification;

    if (!redirectType || redirectType === 'NONE') {
      return null;
    }

    switch (redirectType) {
      case 'TITLE':
        return redirectId ? `/titleSummary/${redirectId}` : '/titles';
      case 'PUBLISHER':
        return redirectId ? `/publisherDetails/${redirectId}` : '/publisher';
      case 'AUTHOR':
        return redirectId ? `/authorDetails/${redirectId}` : '/author';
      case 'ROYALTY':
        return '/royalties';
      case 'SALE':
        return '/dashboard'; // Sales route not found, redirect to dashboard
      case 'PAYOUT':
        return redirectId ? `/payouts/${redirectId}` : '/payouts';
      case 'TRANSACTION':
        return redirectId ? `/transactions/${redirectId}` : '/transactions';
      case 'BOOKING':
        return redirectId ? `/bookings/${redirectId}` : '/bookings';
      case 'ISBN':
        return '/isbn';
      case 'WALLET':
        return '/wallet';
      case 'COUPON':
        return '/coupon';
      default:
        return null;
    }
  }

  /**
   * Handle notification click and navigate to appropriate page
   */
  async onNotificationClick(notification: MyNotification, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const user = this.loggedInUser();
    if (!user) return;

    const url = this.getNotificationUrl(notification);
    if (!url) return;

    // Mark notification as viewed if it's unread
    const isUnread = !notification.markAsReadByUser.includes(user.id);
    if (isUnread) {
      try {
        await this.notificationService.markAsViewed([notification.id]);

        // Update local state immediately for better UX
        this.notificationService.notifications.update((notifications) => {
          return notifications.map((n) => {
            if (n.id === notification.id) {
              return {
                ...n,
                markAsReadByUser: [...n.markAsReadByUser, user.id],
              };
            }
            return n;
          });
        });
      } catch (error) {
        console.error('Failed to mark notification as viewed:', error);
        // Continue with navigation even if marking as viewed fails
      }
    }

    // Close the notification menu
    this.notificationMenuTrigger?.closeMenu();

    // Navigate to the appropriate page
    this.router.navigate([url]);
  }
}
