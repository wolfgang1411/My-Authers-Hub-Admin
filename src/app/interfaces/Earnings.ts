import { Booking } from './Booking';
import { Royalty } from './Royalty';
import { Transaction } from './Transaction';

export interface Earnings {
  id: number;
  royalty: Royalty;
  royaltyId: number;
  transaction: Transaction;
  transactionId: number;
  amount: number;
  status: EarningsStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  Booking?: Booking;
  bookingId?: number;
}
export enum EarningsStatus {
  'PENDING' = 'PENDING',
  'PAID' = 'PAID',
}
