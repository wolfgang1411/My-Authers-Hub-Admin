import { Publisher } from '../pages/publisher/publisher';
import { Address } from './Address';
import { BankDetails } from './BankDetails';
import { Media } from './Media';
import { Royalty } from './Royalty';
import { socialMediaGroup } from './SocialMedia';
import { AuthorStatus } from './StaticValue';
import { Title } from './Titles';
import { User } from './user';

export interface Author {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  titles: Title[];
  profileLink?: string; // Optional link to the author's profile
  username: string;
  about: string;
  medias: Media[];
  bankDetails?: BankDetails[];
  totalEarning: number;
  links: string[];
  address: Address[];
  status: AuthorStatus;
  publishers: Publisher[];
  Royalty: Royalty[];
  signupCode?: string;
  user: User;
  socialMedias: socialMediaGroup[];
  noOfTitles: number;
  booksSold: number;
  lifeTimeEarnings: number
}

export interface AuthorResponse {
  id: number;
  name: string;
  emailid: string;
  phonenumber: string;
  numberoftitles: number;
  royaltiesearned: number;
}

export interface AuthorFilter {
  publisherIds?: number[] | number;
  titleId?: number;
  status?: AuthorStatus | AuthorStatus[];
  page?: number;
  showTotalEarnings?: boolean;
  itemsPerPage?: number;
  searchStr?: string;
  approvedAfter?: string;
  approvedBefore?: string;
  orderBy?: string;
  orderVal?: 'asc' | 'desc';
}

export interface SharedAuthorTitle {
  id: number;
  name: string;
  shortDescription: string;
  longDescription: string;
  frontCoverUrl: string | null;
  platformLinks: SharedPlatformLink[];
}

export interface SharedPlatformLink {
  id: number;
  platform: {
    id: number;
    name: string;
    icon?: string;
    isEbookPlatform: boolean;
    isSuperAdminPricingOnly: boolean;
    isInventoryPlatform: boolean;
    isOtherPlatform: boolean;
  };
  distributionLink: string;
}

export interface SharedAuthorProfile {
  id: number;
  name: string;
  username: string;
  about: string;
  medias: Media[];
  socialMedias: socialMediaGroup[];
  noOfTitles: number;
  booksSold: number;
  platformLinks: SharedPlatformLink[];
  titles: SharedAuthorTitle[];
}
