import { Address } from './Address';
import { Author } from './Authors';
import { BankDetails } from './BankDetails';
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
}

export interface PublisherResponse {
  name: string;
  email: string;
  phonenumber: string;
  titles: number;
  authors: number;
  companyname: string;
}
