import { Injectable, signal } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import {
  MyNotification,
  NotificationFilter,
  NotificationPayload,
  Pagination,
  UpdateNotification,
} from '../interfaces';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  notifications = signal<MyNotification[]>([]);
  private abortController?: AbortController;

  async fetchNotifications(filter: NotificationFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<MyNotification>>('notifications', filter),
        'fetch-notifications'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchNotificationById(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<MyNotification>(`notifications/${id}`),
        'fetch-notification'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createOrUpdateNotification(data: UpdateNotification) {
    try {
      data = { ...data };
      const method = data.id ? 'patch' : 'post';
      const url = data.id ? `notifications/${data.id}` : 'notifications';
      delete data.id;
      return await this.loader.loadPromise(
        this.server[method]<MyNotification>(url, data),
        'create-update-notification'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async markAsViewed(notificationsIds: number[]) {
    try {
      this.server.patch('notifications/mark/viewed', {
        notificationsIds,
      });
    } catch (error) {
      throw error;
    }
  }

  listenToNotifications(token: string) {
    this.stopListening();

    const url = environment.apiUrl + 'sse/notifications';

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to connect SSE');
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            let dataLine = '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                dataLine += line.replace(/^data:\s?/, '');
              }
            }

            if (dataLine.trim()) {
              try {
                const data = JSON.parse(dataLine) as MyNotification;
                this.triggerNotification({
                  message: data.message,
                  title: data.title,
                });
                this.notifications.update((prev) => [data, ...prev]);
              } catch (err) {
                this.logger.logError('Invalid JSON from SSE:');
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          this.logger.logError('SSE connection error');
        }
      });
  }

  stopListening() {
    this.abortController?.abort();
    this.abortController = undefined;
  }

  async triggerNotification(payload: NotificationPayload) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // If still not granted, do nothing
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission denied');
      return;
    }

    const { title, message, icon, data, onClickUrl } = payload;

    // Create the notification
    const notification = new Notification(title, {
      body: message,
      icon: icon || '/assets/icons/notification.png',
      data,
    });

    // Handle click
    notification.onclick = () => {
      window.focus();
      if (onClickUrl) {
        window.location.href = onClickUrl;
      }
      notification.close();
    };
  }
}
