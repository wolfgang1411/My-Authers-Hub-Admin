import { Component } from '@angular/core';
import { NotificationService } from '../../services/notifications';

@Component({
  selector: 'app-notifications',
  imports: [],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications {
  constructor(private notificationService: NotificationService) {}
}
