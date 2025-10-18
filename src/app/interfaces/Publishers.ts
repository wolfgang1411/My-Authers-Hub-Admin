import { Address } from './Address';
import { Author } from './Authors';
import { BankDetails } from './BankDetails';
import { socialMediaGroup } from './SocialMedia';
import { DistributionType, PublisherStatus } from './StaticValue';
import { Title } from './Titles';
import { User } from './user';

export interface Publishers {
  id: number;
  name: string;
  email: string;
  username: string;
  phoneNumber: string;
  designation: string;
  address: Address[];
  bankDetails?: BankDetails[]; // Optional attachments related to the publisher
  user: User;
  titles: Title[];
  authors: Author[];
  status: PublisherStatus;
  socialMedias: socialMediaGroup[];
}

export interface CreatePublisher {
  pocName: string;
  pocEmail: string;
  pocPhoneNumber: string;
  designation: string;
  userPassword: string;
  name: string;
  email: string;
  signupCode?: string;
}

export interface PublisherFilter {
  parentPublisherId?: number;
  status?: PublisherStatus | PublisherStatus[];
}

export interface PublisherResponse {
  id: number;
  name: string;
  email: string;
  phonenumber: string;
  titles: number;
  authors: number;
  companyname: string;
}

export interface PublishingPoints {
  id: string;
  availablePoints: number;
  publisherId: number;
  distributionType: DistributionType;
  createdAt: string;
  updatedAt: string;
}
