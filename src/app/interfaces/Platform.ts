import { BookingType } from './StaticValue';

export enum PlatformStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export interface Platform {
  id: number;
  name: string;
  marginPercent: number;
  type: BookingType;
  status: PlatformStatus;
  createdAt: string;
  updatedAt: string;
}


