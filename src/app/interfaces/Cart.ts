import { Title, Platform } from './index';
import { Coupon } from './Coupon';

export interface CartItem {
  id: number;
  cartId: number;
  titleId: number;
  platformId: number;
  quantity: number;
  price: number;
  total: number;
  deliveryCharge: number;
  couponCode?: string;
  titleDetails?: {
    id: number;
    name: string;
  };
  title?: Title;
  platform?: string | Platform; // API returns string (platform name) or Platform object
  coupon?: Coupon;
  createdAt: string;
  updatedAt: string;
}

export interface AddCartItem {
  titleId: number;
  platformId: number;
  quantity: number;
  coupon?: string;
}

export interface RemoveCartItem {
  cartItemId: number;
  quantity: number;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}
