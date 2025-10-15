import { Address } from './Address';
import { Author } from './Authors';
import { accountType, BankDetails } from './BankDetails';
import { Publishers } from './Publishers';
import { Wallet } from './Wallet';

export interface User {
  id: number;
  email: string;
  accessLevel: AccessLevel;
  wallet?: Wallet;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  url?: string;
  userAddress?: UserAddress;
  publisher?: Publishers;
  auther?: Author;
  address: Address[];
}

export interface CreateUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}
export interface UpdateUserWithTicket {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  panCardNo?: string;
  accountType?: accountType;
  gstNumber?: string;
  publisherName?: string;
  publisherEmail?: string;
  authorName?: string;
  authorEmail?: string;
  authorContactNumber?: string;
  authorAbout?: string;
  authorUsername?: string;
  type?: UpdateTicketType;
}
export enum UpdateTicketType {
  'PUBLISHER' = 'PUBLISHER',
  'AUTHOR' = 'AUTHOR',
  'BANK' = 'BANK',
  'ADDRESS' = 'ADDRESS',
}

export interface UpdateUser extends Partial<CreateUser> {
  id?: number | null;
  accessLevel?: AccessLevel | null;
  address?: Address[];
  publisher?: Publishers;
  auther?: Author;
  url?: string;
}

export type UserAddress = {
  address: string;
  landmark: string | null;
  postalCode: { pincode: string };
};

export type AccessLevel = 'PUBLISHER' | 'AUTHER' | 'USER' | 'SUPERADMIN';
