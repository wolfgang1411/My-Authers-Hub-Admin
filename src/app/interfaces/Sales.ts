import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { EarningsStatus, PlatForm, SalesType } from './StaticValue';
import { Platform } from './Platform';

export interface SalesFilter {
  itemsPerPage?: number;

  page?: number;

  soldBefore?: string;

  soldAfter?: string;

  titleIds?: number[];

  authorIds?: number[];

  publisherIds?: number[];

  platforms?: PlatForm | PlatForm[];

  channals?: string | string[];

  userId?: number;
}

export interface EarningFilter {
  itemsPerPage?: number;
  page?: number;
  paidBefore?: string;
  createdBefore?: string;
  paidAfter?: string;
  titleIds?: number[];
  authorIds?: number[] | number;
  publisherIds?: number[] | number;
  showPublisherAuthorEarnings?: boolean;
  status?: EarningsStatus | EarningsStatus[];
  platforms?: PlatForm | PlatForm[];
  platformIds?: number | number[];
  channals?: string | string[];
  searchStr?: string;
  salesType?: SalesType | SalesType[];
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
}

export interface SalesByPlatformFilter {
  isEbookPlatform?: boolean;
  isInventoryPlatform?: boolean;
  isOtherPlatform?: boolean;
  isSuperAdminPricingOnly?: boolean;
}

export interface SalesByPlatform {
  platformId: number;
  platform: string;
  totalAmount: number;
  totalSale: number;
}

export interface CreateSale {
  type: SalesType;
  titleId: number;
  platformId: number;
  platformName?: string;
  amount?: number;
  quantity: number;
  delivery?: number;
  soldAt?: string;
}

export interface CreateSaleForm {
  type: FormControl<SalesType | undefined>;
  title: FormGroup<{
    id: FormControl<number | undefined>;
    availableOptions: FormControl<number[] | null | undefined>;
  }>;
  platformId: FormControl<number | undefined | null>;
  platformOptions: FormArray<FormControl<Platform>>;
  platformName: FormControl<string | undefined | null>;
  amount: FormControl<number | undefined | null>;
  quantity: FormControl<number | undefined>;
  delivery: FormControl<number | undefined>;
  soldAt: FormControl<string | undefined | null>;
}

export interface SalesCsvData {
  Title: string;
  Type: SalesType;
  Booking_Type: 'EBOOK' | 'PRINT';
  Platform: PlatForm;
  Amount: number;
  Quantity: number;
  Delivery: number;
  Sold_At: string;
}
