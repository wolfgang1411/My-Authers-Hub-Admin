import { Author } from './Authors';
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
  userAddress?: UserAddress;
  publisher?: Publishers;
  auther?: Author;
}

export interface CreateUser {
  firstName: string;
  lastName: string;
}

export interface UpdateUser extends Partial<CreateUser> {
  id?: number | null;
}

export type UserAddress = {
  address: string;
  landmark: string | null;
  postalCode: { pincode: string };
};

export type AccessLevel = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'SUPERADMIN';
