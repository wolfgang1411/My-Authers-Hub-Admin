import { User } from './user';
import { Transaction } from './Transaction';
import { Title } from './Titles';

export interface Booking {
  id: number;
  user: User;
  userDetails: User;
  titleDetails: Title;
  userId: number;
  title: Title;
  totalAmount: number;
  status: BookingStatus;
  bookingDate: string;
  transactions: Transaction[];
  createdAt: string;
}

export interface BookingFilter {
  userId?: number;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  itemsPerPage?: number;
  searchStr?: string;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
