import { FormControl, FormGroup } from '@angular/forms';
import { BookingType, ChannalType, PlatForm, SalesType } from './StaticValue';

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

export interface CreateSale {
  type: SalesType;
  bookingType: BookingType;
  titleId: number;
  platform: PlatForm;
  amount: number;
  quantity: number;
  delivery?: number;
  soldAt?: string;
}

export interface CreateSaleForm {
  type: FormControl<SalesType | undefined>;
  bookingType: FormControl<BookingType | undefined>;
  title: FormGroup<{
    id: FormControl<number | undefined>;
    availableOptions: FormControl<number[] | null | undefined>;
  }>;
  platform: FormControl<PlatForm | undefined>;
  amount: FormControl<number | undefined>;
  quantity: FormControl<number | undefined>;
  delivery: FormControl<number | undefined>;
  soldAt: FormControl<string | undefined | null>;
}

export interface SalesCsvData {
  Title: string;
  Type: SalesType;
  Booking_Type: BookingType;
  Platform: PlatForm;
  Amount: number;
  Quantity: number;
  Delivery: number;
  Sold_At: string;
}
