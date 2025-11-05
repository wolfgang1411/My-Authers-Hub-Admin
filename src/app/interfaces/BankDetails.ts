import { BankDetailsType } from './StaticValue';

export interface BankDetails {
  name: string;
  accountNo: string;
  ifsc: string;
  panCardNo: string;
  accountType: BankDetailsType;
  signupCode?: string;
  id?: number;
  gstNumber: string;
  accountHolderName?: string;
}

export interface createBankDetails {
  name: string;
  accountNo: string;
  ifsc: string;
  panCardNo: string;
  accountType: BankDetailsType;
  signupCode?: string;
  publisherId: number;
  autherId: number;
  id?: number;
}
