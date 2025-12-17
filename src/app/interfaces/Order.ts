import { Booking, PlatForm, Transaction, User } from './index';
import { Address } from './Address';
import { DeliveryStatus, OrderStatus } from './StaticValue';

export interface Order {
  id: number;
  userId?: number;
  user?: User;
  platformId: number;
  platform?: PlatForm;
  totalAmount: number;
  delivery: number;
  weight: number;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  billingAddress: Address | Record<string, any>;
  deliveryAddress: Address | Record<string, any>;
  bookings: Booking[];
  transactions?: Transaction[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilter {
  status?: OrderStatus;
  deliveryStatus?: DeliveryStatus;
  page?: number;
  itemsPerPage?: number;
  searchStr?: string;
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
}

