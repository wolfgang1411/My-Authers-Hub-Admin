export enum AddressLinkType {
  PUBLISHER = 'PUBLISHER',
  AUTHOR = 'AUTHOR',
  USER = 'USER',
}

export interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  autherId?: number;
  publisherId?: number;
  signupCode?: string; // Optional country for the address
  type?: AddressLinkType; // Type to determine linking: PUBLISHER, AUTHOR, or USER
}
export interface Countries {
  name: string;
  isoCode: string;
}
export interface Cities {
  name: string;
}
export interface States {
  name: string;
  isoCode: string;
}
