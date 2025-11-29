import { Booking } from './Booking';
import { TransactionStatus } from './StaticValue';
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
  title: string;
  invoice: string;
}

export interface TransactionFilter {
  page?: number;
  itemsPerPage?: number;
  searchStr?: string;
}
