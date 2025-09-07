export interface Address {
  id: number;
  address:string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  autherId?: number;
  publisherId?:number;
  signupCode?:string; // Optional country for the address
}
