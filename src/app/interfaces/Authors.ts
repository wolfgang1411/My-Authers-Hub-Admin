import { Publisher } from '../pages/publisher/publisher';
import { Address } from './Address';
import { BankDetails } from './BankDetails';
import { Media } from './Media';
import { Royalty } from './Royalty';
import { socialMediaGroup } from './SocialMedia';
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
  authorMedia: Media[];
  bankDetails?: BankDetails[];
  links: string[];
  address: Address[];
  status: AuthorStatus;
  publishers: Publisher[];
  Royalty: Royalty[];
  signupCode?: string;
  user: User;
  socialMedias: socialMediaGroup[];
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
  publisherId?: number;
  titleId?: number;
  status?: AuthorStatus | AuthorStatus[];
}
export enum AuthorStatus {
  Active = 'Active',
  Deactivated = 'Deactivated',
  Rejected = 'Rejected',
  Pending = 'Pending',
}
