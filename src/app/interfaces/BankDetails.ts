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
  accountHolderName?: string;
  accountNo: string;
  ifsc: string;
  panCardNo: string;
  accountType: BankDetailsType;
  signupCode?: string;
  publisherId: number;
  autherId: number;
  id?: number;
}

export interface BankOption {
  BANK: string;
  IFSC: string;
  BRANCH: string;
  CENTRE: string;
  DISTRICT: string;
  STATE: string;
  ADDRESS: string;
  CONTACT: string;
  IMPS: boolean;
  RTGS: boolean;
  CITY: string;
  ISO3166: string;
  NEFT: boolean;
  UPI: boolean;
  BANKCODE: string;
}
