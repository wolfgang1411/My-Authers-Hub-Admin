export enum UserStatus {
  ACTIVE,
  DEACTIVE,
  DELETED,
  PENDING,
}

export enum UserAccessLevel {
  SUPERADMIN = 'SUPERADMIN',
  AUTHER = 'AUTHER',
  PUBLISHER = 'PUBLISHER',
  USER = 'USER',
}

export enum LoginMethod {
  PASSWORD = 'PASSWORD',
  OTP = 'OTP',
  AUTHORIZATION = 'AUTHORIZATION',
}

export enum PasswordChangeType {
  CHANGE = 'CHANGE',
  UPDATE = 'UPDATE',
}

export enum OtpLogStatus {
  USED = 'USED',
  UNUSED = 'UNUSED',
}

export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum PublishingPointTransactionStatus {
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export enum PublishingPointTransactionType {
  PURCHASE = 'PURCHASE',
  SPEND = 'SPEND',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
}

export enum BankDetailsStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
  DELETED = 'DELETED',
}

export enum BankDetailsType {
  SAVING = 'SAVING',
  CURRENT = 'CURRENT',
}

export enum UpdateTicketStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UpdateTicketType {
  PUBLISHER = 'PUBLISHER',
  AUTHOR = 'AUTHOR',
  BANK = 'BANK',
  ADDRESS = 'ADDRESS',
}

export enum AddressStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
  DELETED = 'DELETED',
}

export enum PublisherMediaType {
  LOGO = 'LOGO',
  IMAGE = 'IMAGE',
}

export enum SocialMediaType {
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
  INSTAGRAM = 'INSTAGRAM',
  LINKEDIN = 'LINKEDIN',
  YOUTUBE = 'YOUTUBE',
  WEBSITE = 'WEBSITE',
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  REJECTED = 'REJECTED',
}

export enum InviteType {
  PUBLISHER = 'PUBLISHER',
  AUTHER = 'AUTHER',
}

export enum PuplisherStatus {
  Active = 'Active',
  Pending = 'Pending',
  Rejected = 'Rejected',
  Deactivated = 'Deactivated',
}

export enum PublisherStatus {
  Active = 'Active',
  Pending = 'Pending',
  Rejected = 'Rejected',
  Deactivated = 'Deactivated',
}

export enum PublisherType {
  Publisher = 'Publisher',
  Sub_Publisher = 'Sub_Publisher',
}

export enum AuthorMediaType {
  IMAGE = 'IMAGE',
}

export enum AuthorStatus {
  Active = 'Active',
  Pending = 'Pending',
  Rejected = 'Rejected',
  Deactivated = 'Deactivated',
}

export enum TitleMediaType {
  FULL_COVER = 'FULL_COVER',
  INTERIOR = 'INTERIOR',
  FRONT_COVER = 'FRONT_COVER',
  BACK_COVER = 'BACK_COVER',
  INSIDE_COVER = 'INSIDE_COVER',
  MANUSCRIPT = 'MANUSCRIPT',
}

export enum TitleStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

export enum PublishingType {
  PRINT_EBOOK = 'PRINT_EBOOK',
  ONLY_PRINT = 'ONLY_PRINT',
  ONLY_EBOOK = 'ONLY_EBOOK',
}

export enum TitlePrintingStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum PricingStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
}

export enum TitleCategoryStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum TitleCategoryType {
  CATEGORY = 'CATEGORY',
  SUBCATEGORY = 'SUBCATEGORY',
  TRADE = 'TRADE',
  GENRE = 'GENRE',
}

export enum TitleGenreStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum ProductForm {
  Hardcover = 'Hardcover',
  Paperback = 'Paperback',
}

export enum DistributionType {
  National = 'National',
  Hardbound_National = 'Hardbound_National',
  Global = 'Global',
  National_Prime = 'National_Prime',
  Audiobook = 'Audiobook',
}

export enum ISBNType {
  PRINT = 'PRINT',
  EBOOK = 'EBOOK',
}

export enum VerifiedISBNStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
  APPLIED = 'APPLIED',
  APPROVED = 'APPROVED',
}

export enum PlatForm {
  'AMAZON' = 'AMAZON',
  'FLIPKART' = 'FLIPKART',
  'MAH_PRINT' = 'MAH_PRINT',
  'MAH_EBOOK' = 'MAH_EBOOK',
  'KINDLE' = 'KINDLE',
  'GOOGLE_PLAY' = 'GOOGLE_PLAY',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CC = 'CC',
  DC = 'DC',
  NB = 'NB',
  UPI = 'UPI',
  WALLET = 'WALLET',
  EMI = 'EMI',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceStatus {
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum BookBindingsStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum LaminationTypeStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum PaperType {
  WHITE = 'WHITE',
  OFFWHITE = 'OFFWHITE',
}

export enum PaperQualityStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum SizeCategoryStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum SizeCategoryType {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum RoyaltyStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}

export enum SalesType {
  SALE = 'SALE',
  LIVE_SALE = 'LIVE_SALE',
  INVENTORY = 'INVENTORY',
}

export enum EarningsStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum DeliveryChargesType {
  FIXED = 'FIXED',
  PER_KG = 'PER_KG',
}

export enum DeliveryChargesStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export enum TitleConfigType {
  TOP_SELLER = 'TOP_SELLER',
  MOST_WATCHED = 'MOST_WATCHED',
  RECOMMENDED = 'RECOMMENDED',
  RECOMMENDED_IN_CATEGORY = 'RECOMMENDED_IN_CATEGORY',
  RECOMMENDED_IN_GENRE = 'RECOMMENDED_IN_GENRE',
  TOP_IN_CATEGORY = 'TOP_IN_CATEGORY',
  TOP_IN_GENRE = 'TOP_IN_GENRE',
  MOST_RATED = 'MOST_RATED',
  TRENDING = 'TRENDING',
  NEW_RELEASE = 'NEW_RELEASE',
  FEATURED = 'FEATURED',
}

export enum CouponStatus {
  Active = 'Active',
  Deactive = 'Deactive',
  Deleted = 'Deleted',
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum ApplyOnType {
  BOOK = 'BOOK',
  DELIVERY = 'DELIVERY',
  BOTH = 'BOTH',
}

export enum ISBNStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DELETED = 'DELETED',
  APPLIED = 'APPLIED',
}

export const EBOOK_MSP = '69';

export const StaticValues = {
  ISBNStatus,
  UserStatus,
  UserAccessLevel,
  LoginMethod,
  PasswordChangeType,
  OtpLogStatus,
  WalletTransactionStatus,
  PublishingPointTransactionStatus,
  PublishingPointTransactionType,
  BankDetailsStatus,
  BankDetailsType,
  UpdateTicketStatus,
  UpdateTicketType,
  AddressStatus,
  PublisherMediaType,
  SocialMediaType,
  InviteStatus,
  InviteType,
  PublisherStatus,
  PublisherType,
  AuthorMediaType,
  AuthorStatus,
  TitleMediaType,
  TitleStatus,
  PublishingType,
  TitlePrintingStatus,
  PricingStatus,
  TitleCategoryStatus,
  TitleCategoryType,
  TitleGenreStatus,
  ProductForm,
  DistributionType,
  ISBNType,
  VerifiedISBNStatus,
  PlatForm,
  DeliveryStatus,
  OrderStatus,
  BookingStatus,
  PaymentMethod,
  TransactionStatus,
  InvoiceStatus,
  BookBindingsStatus,
  LaminationTypeStatus,
  PaperType,
  PaperQualityStatus,
  SizeCategoryStatus,
  SizeCategoryType,
  RoyaltyStatus,
  EarningsStatus,
  DeliveryChargesType,
  DeliveryChargesStatus,
  TitleConfigType,
  CouponStatus,
  DiscountType,
  ApplyOnType,
  PuplisherStatus,
  SalesType,
  EBOOK_MSP,
} as const;
