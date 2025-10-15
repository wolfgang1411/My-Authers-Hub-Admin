import { FormControl } from '@angular/forms';
import { ChannalType } from './Titles';
import { Earnings } from './Earnings';

export interface Royalty {
  channal: ChannalType;
  id: number;
  percentage: number;
  authorId?: number;
  publisherId?: number;
  titleId: number;
  earnings: Earnings[];
  titlename: string;
}

export interface CreateRoyalty {
  titleId: number;
  authorId?: number | null;
  author?: string;
  publisher?: string;
  title?: string;
  publisherId?: number | null;
  print_mah: number | null;
  print_third_party: number | null;
  prime: number | null;
  ebook_mah: number | null;
  ebook_third_party: number | null;
  name?: string | null;
  titlename?: string;
  totalEarnings: number;
}

export interface UpdateRoyalty extends Partial<CreateRoyalty> {
  id?: number | null;
}

export enum RoyaltyStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}
export interface RoyaltyFilter {
  publisherId?: number;
  authorId?: number;
  bookId?: number;
  startDate?: string;
  endDate?: string;
  page: number;
  itemsPerPage: number;
  searchStr: string;
}

export interface RoyaltyFormGroup {
  id: FormControl<number | null>;
  name: FormControl<string | null | undefined>;
  titleId: FormControl<number | null | undefined>;
  authorId: FormControl<number | null | undefined>;
  publisherId: FormControl<number | null | undefined>;
  print_mah: FormControl<number | null | undefined>;
  print_third_party: FormControl<number | null | undefined>;
  prime: FormControl<number | null | undefined>;
  ebook_mah: FormControl<number | null | undefined>;
  ebook_third_party: FormControl<number | null | undefined>;
}

export type RoyalFormGroupAmountField =
  | 'print_mah'
  | 'print_third_party'
  | 'prime'
  | 'ebook_mah'
  | 'ebook_third_party';
