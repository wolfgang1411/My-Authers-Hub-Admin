export interface Wallet {
  id: number;
  totalAmount: number;
  holdAmount: number;
  earningTillNow: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddWalletAmount {
  authorId?: number;
  publisherId?: number;
  userId?: number;
  amount: number;
  method: 'GATEWAY' | 'WALLET' | 'SUPERADMIN';
  comment?: string;
  sendMail: boolean;
}

export interface AddWalletAmountResponse {
  status: 'success' | 'pending';
  message: string;
  url?: string;
  tnx?: number;
}
