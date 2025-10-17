import { Component, OnInit, signal } from '@angular/core';
import { NotificationService } from '../../services/notifications';
import {
  MyNotification,
  NotificationFilter,
  UpdateNotification,
} from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { format } from 'date-fns';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { AddUpdateNotification } from '../../components/add-update-notification/add-update-notification';

@Component({
  selector: 'app-notifications',
  imports: [
    SharedModule,
    ListTable,
    MatIconModule,
    MatIconButton,
    MatButtonModule,
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications implements OnInit {
  constructor(
    private notificationService: NotificationService,
    private translateService: TranslateService,
    private matDialog: MatDialog
  ) {}

  filter = signal<NotificationFilter>({
    page: 1,
    itemsPerPage: 30,
  });
  lastPage = signal(1);

  notfications = signal<MyNotification[] | null>(null);

  dataSource = new MatTableDataSource<any>();

  displayedColumns: string[] = [
    'serial',
    'title',
    'message',
    'sendat',
    'to',
    'actions',
  ];

  ngOnInit() {
    this.fetchAndUpdateNotifications();
  }

  mapSourceData() {
    const notifications = this.notfications() || [];
    this.dataSource.data =
      notifications.map(
        ({ id, title, message, sendAt, byAccessLevel, user, sent }, index) => ({
          id,
          serial: index + 1,
          title,
          message,
          sendat: sendAt ? format(sendAt, 'dd-MM-yyyy hh:mm a') : undefined,
          to: byAccessLevel || user?.length,
          sent,
          byAccessLevel,
          user,
          sendAt,
        })
      ) || [];
  }

  async fetchAndUpdateNotifications() {
    try {
      const { items, itemsPerPage, totalCount } =
        await this.notificationService.fetchNotifications(this.filter());

      this.notfications.update((notifications) =>
        notifications ? [...notifications, ...items] : items
      );
      this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
      this.mapSourceData();
    } catch (error) {
      console.log(error);
    }
  }

  loadMoreNotifications() {
    this.filter.update((filter) => {
      return { ...filter, page: (filter.page || 0) + 1 };
    });
    this.fetchAndUpdateNotifications();
  }

  onAddEditNotification(notification?: MyNotification) {
    const dialog = this.matDialog.open(AddUpdateNotification, {
      data: {
        notification,
        onClose: () => dialog.close(),
        onSubmit: async (data: UpdateNotification) => {
          try {
            const response =
              await this.notificationService.createOrUpdateNotification({
                ...data,
                id: notification?.id,
              });

            this.notfications.update((notfications) => {
              if (notification) {
                notfications =
                  notfications?.map((n) =>
                    n.id === response.id ? response : n
                  ) || [];
              } else {
                notfications?.unshift(response);
              }

              return notfications;
            });

            dialog.close();

            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('success'),
              html: this.translateService.instant(
                notification?.id
                  ? 'notificationupdated'
                  : 'notificationcreateed',
                {
                  title: data.title,
                  sentAt: format(
                    data.sendAt || new Date(),
                    'dd-MM-yyyy hh:mm a'
                  ),
                }
              ),
            });

            this.mapSourceData();
          } catch (error) {
            console.log(error);
          }
        },
      },
    });
  }

  async onDeleteNotification(notification: MyNotification) {
    try {
      const { value } = await Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning'),
        html: this.translateService.instant('notificationdeletewarning', {
          title: notification.title,
        }),
        showCancelButton: true,
        confirmButtonText: this.translateService.instant('yes'),
        cancelButtonText: this.translateService.instant('no'),
        customClass: {
          confirmButton: '!bg-red-500',
          cancelButton: '!bg-primary',
        },
      });
      if (!value) return;

      await this.notificationService.deleteNotification(notification.id);
      this.notfications.update((notifications) => {
        notifications =
          notifications?.filter(({ id }) => id !== notification.id) || [];
        return notifications;
      });
      this.mapSourceData();
    } catch (error) {
      console.log(error);
    }
  }
}
