import { FormControl } from '@angular/forms';
import { Author, PlatForm, Publishers, RoyaltyStatus, Title } from './index';
import { Earnings } from './Earnings';

export interface Royalty {
  platform: PlatForm;
  id: number;
  percentage: number;
  authorId?: number;
  publisherId?: number;
  titleId: number;
  earnings: Earnings[];
  titlename: string;
  author: Author | null;
  publisher: Publishers | null;
  title: Title;
  status: RoyaltyStatus;
}

export interface CreateRoyalty {
  titleId: number;
  authorId?: number | null;
  author?: string;
  publisher?: string;
  title?: string;
  publisherId?: number | null;
  platform: PlatForm;
  percentage: number;
  name?: string | null;
  titlename?: string;
  totalEarnings: number;
}

export interface UpdateRoyalty {
  id?: number | null;
  titleId?: number;
  authorId?: number | null;
  publisherId?: number | null;
  platformId: number;
  percentage: number;
  name?: string | null;
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
  platform: FormControl<string | null | undefined>;
  percentage: FormControl<number | null | undefined>;
}
