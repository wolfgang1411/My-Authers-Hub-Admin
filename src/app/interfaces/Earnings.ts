import { Royalty } from './Royalty';
import { EarningsStatus, PlatForm } from './StaticValue';

export interface Earnings {
  id: number;
  amount: number;
  holdUntil: string | null;
  paidAt: string | null;
  platform: PlatForm;
  quantity: number;
  royalty: Royalty;
  status: EarningsStatus;
  createdAt: Date;
  updatedAt: Date;
}
