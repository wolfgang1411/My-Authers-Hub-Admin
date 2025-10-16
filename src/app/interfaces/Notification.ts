import { AccessLevel } from './user';

export interface MyNotification {
  id: number;
  title: string;
  message: string;
  sent: boolean;
  sendAt: string;
  markAsReadByUser: number[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilter {
  itemsPerPage?: number;
  page?: number;
  sent?: boolean;
  unread?: boolean;
  popupSuperadmin?: boolean;
  byAccessLevel?: AccessLevel;
}

export interface CreateNotification {
  title: string;
  message: string;
  sendAt: string;
  userIds?: number[];
}

export interface UpdateNotification extends Partial<CreateNotification> {
  id?: number | null;
}

// src/app/helpers/notification.helper.ts
export interface NotificationPayload {
  title: string;
  message: string;
  icon?: string;
  data?: any;
  onClickUrl?: string; // optional: open when clicked
}
