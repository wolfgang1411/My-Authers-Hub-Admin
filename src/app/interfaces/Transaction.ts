import { Booking } from './Booking';
import { User } from './user';

export interface Transaction {
  id: number;
  booking: Booking;
  user: User;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: string;
  paymentGateway: string;
  paymentGatewayTxnId: string;
  merchantTxnId: string;
  paymentGatewayRef: string;
  userId: number;
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export interface TransactionFilter {
  page?: number;
  itemsPerPage?: number;
}
