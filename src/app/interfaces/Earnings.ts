import { Booking } from './Booking';
import { Royalty } from './Royalty';
import { ChannalType, EarningsStatus, PlatForm } from './StaticValue';
import { Transaction } from './Transaction';

export interface Earnings {
  id: number;
  amount: number;
  channal: ChannalType;
  holdUntil: string | null;
  paidAt: string | null;
  platform: PlatForm;
  royalty: Royalty;
  status: EarningsStatus;
  createdAt: Date;
  updatedAt: Date;
}
