import { AccessLevel, User } from './user';

export type NotificationRedirectType =
  | 'TITLE'
  | 'PUBLISHER'
  | 'AUTHOR'
  | 'ROYALTY'
  | 'SALE'
  | 'PAYOUT'
  | 'TRANSACTION'
  | 'BOOKING'
  | 'ISBN'
  | 'WALLET'
  | 'COUPON'
  | 'NONE';

export interface MyNotification {
  id: number;
  title: string;
  message: string;
  sent: boolean;
  sendAt: string;
  byAccessLevel?: AccessLevel;
  user?: User[];
  markAsReadByUser: number[];
  redirectType?: NotificationRedirectType;
  redirectId?: number | null;
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
  byAccessLevel?: AccessLevel;
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
