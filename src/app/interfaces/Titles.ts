import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Publisher } from '../pages/publisher/publisher';
import { Author } from './Authors';
import { Booking } from './Booking';
import { ISBN } from './Isbn';
import { Publishers } from './Publishers';
import { Royalty, RoyaltyFormGroup } from './Royalty';
import { User } from './user';
import { Media, TitleMediaGroup } from './Media';
import {
  PublishingType,
  TitleMediaType,
  TitleStatus,
  TitleCategoryType,
  DistributionType,
  PaperType,
  SizeCategoryType,
  TitleConfigType,
  PlatForm,
  BookingType,
  PricingStatus,
} from './index';

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
  submission_date?: string;
  category: TitleCategory;
  subCategory: TitleCategory;
  tradeCategory: TitleCategory;
  genre: TitleGenre;
  keywords: string;
  copiesSold: number;
  totalSales: number;
  publisherDisplayNames: {
    [id: number]: string;
  };
  authorDisplayNames: {
    [id: number]: string;
  };
  publisherId: number;
  publisher: Publishers;
  authors?: AuthorTitle[];
  printing?: TitlePrinting[];
  Booking: Booking[];
  royalties?: Royalty[];
  documentMedia?: TitleMedia[];
  isbnPrint?: string;
  isbnEbook?: string;
  media?: TitleMedia[];
  pricing?: TitlePricing[];
  distribution?: TitleDistribution[];
  updatedAt?: string;
  titlePlatformIdentifier: TitlePlatformIdentifier[];
}
export interface TitleStepProgress {
  bookDetails: boolean;
  uploadDocuments: boolean;
  printDetails: boolean;
  pricing: boolean;
  royalty: boolean;
  distribution: boolean;
}

export interface TitlePlatformIdentifier {
  id: number;
  platform: PlatForm;
  type: BookingType;
  uniqueIdentifier?: string;
  distributionLink?: string;
}

export interface TitleMedia extends Media {
  type: TitleMediaType;
  noOfPages: number;
}

// export type TitleMediaType =
//   | 'FULL_COVER'
//   | 'INTERIOR'
//   | 'FRONT_COVER'
//   | 'BACK_COVER'
//   | 'INSIDE_COVER ';

export interface TitleDistribution {
  id: number;
  type: DistributionType;
  link: string;
}

export interface AuthorTitle {
  id: number;
  author: Author;
  display_name: string; // Author display name from form
  order: number;
}

export interface ApproveTitlePayload {
  platformIdentifier: CreatePlatformIdentifier[];
}

//  distributionType: DistributionType;
//   link: string;

export interface ApproveTitleGroup {
  distributionType: FormControl<DistributionType>;
  link: FormControl<string | null>;
}

export interface TitlePricing {
  id: number;
  platform: PlatForm;
  salesPrice: number;
  mrp: number;
  msp: number;
  deliveryWeight: number; // Computed from TitlePrinting
  deliveryCharges: number; // Normal delivery charge based on weight
  createdAt: string;
  updatedAt: string;
  status: PricingStatus;
}

export interface TitleCreate {
  id?: number;
  name: string;
  subTitle: string;
  publisherId: number;
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
  publisherIds?: number | number[];
  authorIds?: number | number[];
  publishedAfter?: string;
  itemsPerPage?: number;
  page?: number;
  orderBy?: string;
  orderByVal?: string;
  status?: TitleStatus | TitleStatus[];
  configType?: TitleConfigType | TitleConfigType[];
  publishedBefore?: string;
  categoryId?: number | number[];
  genreId?: number | number[];
  bestSellingMAH?: boolean;
  searchStr?: string;
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

// export enum ChannalType {
//   PRINT_MAH = 'PRINT_MAH',
//   PRINT_THIRD_PARTY = 'PRINT_THIRD_PARTY',
//   PRIME = 'PRIME',
//   EBOOK_MAH = 'EBOOK_MAH',
//   EBOOK_THIRD_PARTY = 'EBOOK_THIRD_PARTY',
// }

// export enum TitleCategoryType {
//   CATEGORY = 'CATEGORY',
//   SUBCATEGORY = 'SUBCATEGORY',
//   TRADE = 'TRADE',
// }
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

// export enum PaperType {
//   WHITE = 'WHITE',
//   OFFWHITE = 'OFFWHITE',
// }

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
  id?: number | null;
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
}

export interface PricingCreate {
  id?: number | null;
  platform: string;
  salesPrice: number;
  mrp: number;
}

export type PricingGroup = FormGroup<{
  id: FormControl;
  platform: FormControl;
  salesPrice: FormControl;
  mrp: FormControl;
}>;

export interface TitleFormGroup {
  printingFormat: FormControl<string | null | undefined>;
  hasFiles: FormControl<boolean | null | undefined>;
  publishingType: FormControl<PublishingType | null | undefined>;
  titleDetails: FormGroup<TitleDetailsFormGroup>;
  printing: FormGroup<PrintingFormGroup>;
  pricing: FormArray<PricingGroup>;
  documentMedia: FormArray<FormGroup<TitleMediaGroup>>;
  royalties: FormArray<FormGroup<RoyaltyFormGroup>>;
  distribution: FormArray<FormGroup<TitleDistributionGroup>>;
}

export interface TitleDistributionGroup {
  id: FormControl<number | null>;
  type: FormControl<DistributionType>;
  name: FormControl<string>;
  isSelected: FormControl<boolean>;
  availablePoints: FormControl<number>;
}

// 👤 Author group
export interface AuthorFormGroup {
  id: FormControl<number | null | undefined>;
  name: FormControl<string | null | undefined>;
  keepSame: FormControl<boolean | null | undefined>;
  displayName: FormControl<string | null | undefined>;
}

// 📖 ISBN group
export interface IsbnFormGroup {
  id: FormControl<number | null | undefined>;
  isbnNumber: FormControl<string | null | undefined>;
  format: FormControl<string | null | undefined>;
}

// 🏢 Publisher group
export interface PublisherFormGroup {
  id: FormControl<number | null | undefined>;
  name: FormControl<string | null | undefined>;
  keepSame: FormControl<boolean | null | undefined>;
  displayName: FormControl<string | null | undefined>;
}

export interface PrintingFormGroup {
  id: FormControl<number | null>;
  bookBindingsId: FormControl<number | null>;
  totalPages: FormControl<number>;
  colorPages: FormControl<number>;
  isColorPagesRandom: FormControl<boolean>;
  bwPages: FormControl<number>;
  insideCover: FormControl<boolean>;
  laminationTypeId: FormControl<number | null>;
  paperType: FormControl<string>;
  paperQuailtyId: FormControl<number | null>;
  sizeCategoryId: FormControl<number | null>;
  msp: FormControl<number | null>;
}

// 🏷️ TitleDetails group (now using subgroups)
export interface TitleDetailsFormGroup {
  name: FormControl<string | null | undefined>;
  subTitle: FormControl<string | null | undefined>;
  longDescription: FormControl<string | null | undefined>;
  shortDescription: FormControl<string | null | undefined>;
  edition: FormControl<number | null | undefined>;
  language: FormControl<string | null | undefined>;
  subject: FormControl<string | null | undefined>;
  status: FormControl<TitleStatus | null | undefined>;
  category: FormControl<number | null | undefined>;
  subCategory: FormControl<number | null | undefined>;
  tradeCategory: FormControl<number | null | undefined>;
  genre: FormControl<number | null | undefined>;
  keywords: FormControl<string | null | undefined>;
  isUniqueIdentifier: FormControl<boolean | null | undefined>;
  keywordOption: FormControl<string | null | undefined>;
  manualKeywords: FormControl<string | null | undefined>;
  autoKeywords: FormControl<string | null | undefined>;

  publisher: FormGroup<PublisherFormGroup>;
  publisherDisplay: FormControl<string | null | undefined>;

  authorIds: FormArray<FormGroup<AuthorFormGroup>>;
  isbnPrint: FormControl<string | null | undefined>;
  isbnEbook: FormControl<string | null | undefined>;
}

export interface PlatFormIndetifierGroup {
  uniqueIdentifier: FormControl<string | null>;
  platform: FormControl<PlatForm>;
  type: FormControl<BookingType>;
  distributionLink: FormControl<string | null>;
}

export interface CreatePlatformIdentifier {
  platform: PlatForm;
  type: BookingType;
  uniqueIdentifier?: string;
  distributionLink?: string;
}

export interface CreateDistributionLink {
  distributionType: DistributionType;
  link: string;
}

export interface TitleDistributionFilter {
  itemsPerPage?: number;
  page?: number;
  publisherIds?: number | number[];
  titleIds?: number | number[];
  authorIds?: number | number[];
}
