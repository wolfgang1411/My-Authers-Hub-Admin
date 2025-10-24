import { User } from './user';
import { Transaction } from './Transaction';
import { BookingStatus, BookingType, ChannalType, Title } from './index';
import { Royalty } from './Royalty';

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
  royalties: Royalty[];
  createdAt: string;
  type: BookingType;
  channal: ChannalType;
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
