import { User } from './user';

export interface WalletamountTransaction {
  id: number;
  addedBy: User;
  addedMethod: WalletAmountTransactionMethod;
  amount: number;
  status: WalletAmountTransactionStatus;
  createdAt: string;
  updatedAt: string;
  comment: string;
  sendMail: boolean;
  type: WalletAmountTransactionType;
  wallet: {
    id: number;
    user: User;
  };
}
export type WalletAmountTransactionStatus = 'PENDING' | 'FAILED' | 'COMPLETED';
export type WalletAmountTransactionMethod = 'SUPERADMIN' | 'GATEWAY' | 'WALLET';

export type WalletAmountTransactionType = 'GIFT';

export type WalletAmountTransactionFilter = {
  itemsPerPage?: number;
  page?: number;
  status?: WalletAmountTransactionStatus;
  searchStr?: string;
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
};
