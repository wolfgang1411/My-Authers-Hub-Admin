export interface BankDetails {
  name: string;
    accountNo: string;
  ifsc: string;
  panCardNo: string;
  accountType: 'SAVING';
  signupCode?: string;
 id?: number;
}

export type accountType = 'SAVING' | 'CURRENT';

export interface createBankDetails 
    {  name: string;
    accountNo: string;
  ifsc: string;
  panCardNo: string;
  accountType: 'SAVING';
  signupCode?: string;
  publisherId: number;
  autherId:number;
  id?: number;
    }