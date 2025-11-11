import { Address } from './Address';
import { Author } from './Authors';
import { Publishers } from './Publishers';
import { BankDetailsType, UpdateTicketType } from './index';
import { Wallet } from './Wallet';

export interface User {
  id: number;
  email: string;
  accessLevel: AccessLevel;
  fullName: string;
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
  accountHolderName?: string;
  accountNo?: string;
  ifsc?: string;
  panCardNo?: string;
  accountType?: BankDetailsType;
  gstNumber?: string;
  publisherName?: string;
  publisherEmail?: string;
  publisherPocName?: string;
  publisherPocEmail?: string;
  publisherPocPhoneNumber?: string;
  publisherDesignation?: string;
  authorName?: string;
  authorEmail?: string;
  authorContactNumber?: string;
  authorAbout?: string;
  authorUsername?: string;
  type?: UpdateTicketType;
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
export enum AccessLevelEnum {
  'PUBLISHER',
  'AUTHER',
  'USER',
  'SUPERADMIN',
}
