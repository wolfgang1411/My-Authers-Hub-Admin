import { Publisher } from '../pages/publisher/publisher';
import { Author } from './Authors';
import { Booking } from './Booking';
import { ISBN } from './Isbn';
import { Media } from './Media';
import { Publishers } from './Publishers';
import { User } from './user';

export interface Title {
  id: number;
  name: string;
  subTitle: string;
  longDescription: string;
  shortDescription: string;
  edition: number;
  language: string;
  subject: string;
  status: TitleStatus;
  category: TitleCategory;
  subCategory: TitleCategory;
  tradeCategory: TitleCategory;
  genre: TitleGenre;
  keywords: string;
  publisherDisplayNames: {
    [id: number]: string;
  };
  authorDisplayNames: {
    [id: number]: string;
  };
  publisher: Publishers;
  authors: Author[];
  isbn: ISBN;
  printing: TitlePrinting[];
  Booking: Booking[];
  Royalty: Royalty[];
  documentMedia: Media[];
}
export interface TitleResponse {
  title: string;
  isbn: string;
  pages: number | string;
  royaltiesearned: number;
  authors: string;
  publishedby: string;
}

export interface TitleCategory {
  id: number;
  name: string;
  parent: TitleCategory;
  children: TitleCategory[];
  type: TitleCategoryType;
  title: Title[];
  subTitle: Title[];
  trade: Title[];
}
export interface TitleFilter {
  publisherId?: number;
}
export interface TitleGenre {
  id: number;
  name: string;
  Title: Title[];
}
export interface TitlePrinting {
  id: number;
  title: Title;
  bindingType: BookBindings;
  bookBindingsId: number;
  totalPages: number;
  colorPages: number;
  isColorPagesRandom: boolean;
  bwPages: number;
  insideCover: boolean;
  deliveryCharge: number;
  laminationType: LaminationType;
  laminationTypeId: number;
  paperType: PaperType;
  gsm: PaperQuailty;
  paperQuailtyId: number;
  bookSize: SizeCategory;
  printCost: number;
  customPrintCost: number;
}

export interface Royalty {
  id: number;
  percentage: number;
  channal: ChannalType;
  title: Title;
  author: Author;
  publisher: Publisher;
  status: RoyaltyStatus;
}
export enum RoyaltyStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum ChannalType {
  PRINT_MAH = 'PRINT_MAH',
  PRINT_THIRD_PARTY = 'PRINT_THIRD_PARTY',
  PRIME = 'PRIME',
  EBOOK_MAH = 'EBOOK_MAH',
  EBOOK_THIRD_PARTY = 'EBOOK_THIRD_PARTY',
  AUTHOR = 'AUTHOR',
  PUBLISHER = 'PUBLISHER',
}

export enum TitleStatus {
  Active = 'Active',
  Deactivated = 'Deactivated',
}

export enum TitleCategoryType {
  CATEGORY = 'CATEGORY',
  SUBCATEGORY = 'SUBCATEGORY',
  TRADE = 'TRADE',
}
export interface BookBindings {
  id: number;
  name: string;
  price: number;
  description: string;
  TitlePrinting: TitlePrinting[];
}
export interface LaminationType {
  id: number;
  name: string;
  price: number;
  description: string;
  TitlePrinting: TitlePrinting[];
}

export enum PaperType {
  WHITE = 'WHITE',
  OFFWHITE = 'OFFWHITE',
}

export interface PaperQuailty {
  id: number;
  name: string;
  colorPrice: number;
  blackAndWhitePrice: number;
  note: string;
  TitlePrinting: TitlePrinting[];
}

export interface SizeCategory {
  id: number;
  size: string;
  width: number;
  length: number;
  price: number;
  type: SizeCategoryType;
  TitlePrinting: TitlePrinting[];
}

export enum SizeCategoryType {
  A = 'A',
  B = 'B',
  C = 'C',
}
