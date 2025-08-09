export interface User {
  id: number;
  email: string;
  accessLevel: AccessLevel;
  firstName: string;
  lastName: string;
  phone: string;
  userAddress?: UserAddress;
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

export type AccessLevel = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
