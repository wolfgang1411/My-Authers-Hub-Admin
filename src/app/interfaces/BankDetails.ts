export interface BankDetails {
  name: string;
  accountNo: string;
  ifsc: string;
  panCardNo: string;
  accountType: accountType;
  signupCode?: string;
  id?: number;
  gstNumber: string;
}

export type accountType = 'SAVING' | 'CURRENT';

export interface createBankDetails {
  name: string;
  accountNo: string;
  ifsc: string;
  panCardNo: string;
  accountType: accountType;
  signupCode?: string;
  publisherId: number;
  autherId: number;
  id?: number;
}
