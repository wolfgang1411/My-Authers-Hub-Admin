import { User } from './user';
import { Wallet } from './Wallet';

export interface Payout {
  id: number;
  requestedAmount: number;
  wallet: Wallet;
  status: PayoutStatus;
  user: User;
  createdAt: string;
}

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export type PayoutFilter = {
  itemsPerPage?: number;
  page?: number;
  status?: PayoutStatus;
};
