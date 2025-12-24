import { Address } from './Address';
import { Author } from './Authors';
import { BankDetails } from './BankDetails';
import { Media } from './Media';
import { socialMediaGroup } from './SocialMedia';
import {
  DistributionType,
  PublisherStatus,
  PublisherType,
} from './StaticValue';
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
  medias: Media[];
  titles: Title[];
  authers: Author[];
  noOfTitles: number;
  noOfAuthors: number;
  status: PublisherStatus;
  socialMedias: socialMediaGroup[];
  allowCustomPrintingPrice?: boolean;
  allowAuthorCopyPrice?: boolean;
  type: PublisherType;
  addedBy: User;
  isApprovedByPublisher: boolean;
}

export interface CreatePublisher {
  pocName: string;
  pocEmail: string;
  pocPhoneNumber: string;
  designation: string;
  name: string;
  email: string;
  signupCode?: string;
}

export interface PublisherFilter {
  page?: number;
  itemsPerPage?: number;
  parentPublisherId?: number;
  status?: PublisherStatus | PublisherStatus[] | null | string;
  searchStr?: string;
  authorIds?: number;
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
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

export interface PublishingPointCost {
  id: number;
  publisherId: number;
  distributionType: DistributionType;
  amount: number;
  publisher: {
    email: string;
    name: string;
    designation: string;
    username: string;
    id: number;
    allowCustomPrintingPrice: boolean;
    allowAuthorCopyPrice: boolean;
    status: PublisherStatus;
    type: PublisherType;
    isApprovedByPublisher: boolean;
  };
}
