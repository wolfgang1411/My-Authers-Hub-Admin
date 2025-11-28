import { Royalty } from './Royalty';
import { EarningsStatus } from './StaticValue';
import { Platform } from './Platform';

export interface Earnings {
  id: number;
  amount: number;
  holdUntil: string | null;
  paidAt: string | null;
  platform: Platform;
  quantity: number;
  royalty: Royalty;
  status: EarningsStatus;
  createdAt: Date;
  updatedAt: Date;
}
