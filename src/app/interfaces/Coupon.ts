import { ApplyOnType, CouponStatus, DiscountType } from './StaticValue';

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discountType: DiscountType;
  applyOn: ApplyOnType;
  discountValue: number;
  startDate?: Date;
  endDate?: Date;
  usageLimit: number;
  userUsageLimit: number;
  usedCount: number;
  isActive: boolean;
  perUnit: boolean;
  adminId: number;
  titleId?: number;
  autherId?: number;
  publisherId?: number;
  status: CouponStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddCoupon {
  code: string;
  description?: string;
  discountType: DiscountType;
  applyOn: ApplyOnType;
  discountValue: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  userUsageLimit?: number;
  titleId?: number;
  autherId?: number;
  publisherId?: number;
}

export interface UpdateCoupon extends Partial<AddCoupon> {
  id?: number | null;
}

export interface CouponFilter {
  itemsPerPage?: number;
  page?: number;
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
}
