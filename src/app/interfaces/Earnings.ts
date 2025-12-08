import { Royalty } from './Royalty';
import { EarningsStatus, SalesType } from './StaticValue';
import { Platform } from './Platform';

export interface Earnings {
  id: number;
  amount: number;
  holdUntil: string | null;
  paidAt: string | null;
  platform: Platform;
  platformName?: string;
  quantity: number;
  royalty: Royalty;
  status: EarningsStatus;
  salesType?: SalesType;
  createdAt: Date;
  updatedAt: Date;
}
