import { Publisher } from '../pages/publisher/publisher';
import { Author } from './Authors';
import { Booking } from './Booking';
import { ISBN } from './Isbn';
import { Media } from './Media';
import { Publishers } from './Publishers';
import { Royalty } from './Royalty';
import { User } from './user';

export interface Title {
  id: number;
  name: string;
  publishingType: PublishingType;
  isUniqueIdentifier: boolean;
  publisherDisplay: string;
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
  printing: TitlePrinting[];
  Booking: Booking[];
  Royalty: Royalty[];
  documentMedia: Media[];
  isbnPrint: {
    id: number;
    isbnNumber: string;
    format: string;
  };
  isbnEbook: {
    id: number;
    isbnNumber: string;
    format: string;
  };
  media: Media[];
}
export interface TitleCreate {
  id?: number;
  name: string;
  subTitle: string;
  publisherId: 1;
  publisherDisplay: string;
  publishingType: PublishingType;
  subject: string;
  language: string;
  longDescription: string;
  shortDescription: string;
  edition: number;
  isbnPrint: string;
  isbnEbook: string;
  categoryId: number;
  subCategoryId: number;
  tradeCategoryId: number;
  genreId: number;
  keywords: string;
  isUniqueIdentifier: false;
  authorIds: [
    {
      id: number;
      displayName: string;
    }
  ];
}
export enum PublishingType {
  'PRINT_EBOOK' = 'PRINT_EBOOK',
  'ONLY_PRINT' = 'ONLY_PRINT',
  'ONLY_EBOOK' = 'ONLY_EBOOK',
}
export interface TitleResponse {
  title: string;
  isbnPrint: string;
  isbnEbook: string;
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
  paperQuailty: PaperQuailty;
  paperQuailtyId: number;
  sizeCategory: SizeCategory;
  printCost: number;
  customPrintCost: number;
  customDeliveryCharges: number;
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
export interface TitlePrintingPayload {}

export interface SizeCategory {
  id: number;
  size: string;
  width: number;
  length: number;
  price: number;
  type: SizeCategoryType;
  packetPrice: number;
  weightMultiplayer: number;
  TitlePrinting: TitlePrinting[];
}

export enum SizeCategoryType {
  A = 'A',
  B = 'B',
  C = 'C',
}

export interface TitlePrintingCostPayload {
  paperQuailtyId: number;
  totalPages: number;
  colorPages: number;
  laminationTypeId: number;
  bindingTypeId: number;
  sizeCategoryId: number;
  isColorPagesRandom?: boolean;
  insideCover?: boolean;
  bwPages?: number;
  quantity?: number;
}

export interface TitlePrintingCostResponse {
  printCost: number;
  deliveryCost: number;
  deliveryWeight: number;
  deliveryWeightPerItem: number;
  printPerItem: number;
}

export interface CreateBindingType {
  name: string;
  price: number;
}
export interface UpdateBindingType extends CreateBindingType {
  id?: number | null;
}

export interface CreateLaminationType {}
export interface UpdateLaminationType extends CreateBindingType {
  id?: number | null;
}

export interface CreatePaperQualityType {
  name: string;
  colorPrice: number;
  blackAndWhitePrice: number;
}
export interface UpdatePaperQualityType extends CreatePaperQualityType {
  id?: number | null;
}

export interface CreateSizeType {
  width: number;
  length: number;
  price: number;
  weightMultiplayer: number;
  packetPrice: number;
  type: string;
}

export interface UpdateSizeType extends CreateSizeType {
  id?: number | null;
}

export interface PrintingCreate {
  titleId: number;
  bindingTypeId: number;
  totalPages: number;
  colorPages: number;
  laminationTypeId: number;
  paperType: PaperType;
  paperQuailtyId: number;
  sizeCategoryId: number;
  customPrintCost: number;
  insideCover: boolean;
  isColorPagesRandom: boolean;
  deliveryCharge: number;
  mrpPrint: number;
  mrpEbook: number;
}
