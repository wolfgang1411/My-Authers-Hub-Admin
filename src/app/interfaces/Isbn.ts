import { Author } from './Authors';
import { Publishers } from './Publishers';
import { ISBNStatus, ISBNType, VerifiedISBNStatus } from './StaticValue';
import { Title } from './Titles';
import { User } from './user';

export interface ISBN {
  id: number;
  isbnNumber: string;
  image?: string;
  type: ISBNType;
  admin: User;
  title: Title[];
  status: VerifiedISBNStatus;
  bunko: string;
  language: string;
  mrp: number;
  noOfPages: number;
  publisher: Publishers;
  edition: string;
  authors: Author[];
  titleName: string;
}

export interface createIsbn {
  id?: number;
  isbnNumber?: string;
  type: ISBNType;
  titleName: string;
  authorIds: number[];
  publisherId: number;
  noOfPages: number;
  language: string;
  mrp: number;
  edition: string;
  status?: ISBNStatus;
}
export interface ISBNFilter {
  page: number;
  itemsPerPage: number;
  searchStr: string;
  status?: ISBNStatus | ISBNStatus[];
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
}
