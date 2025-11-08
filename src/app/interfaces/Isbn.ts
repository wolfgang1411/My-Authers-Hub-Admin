import { ISBNType, VerifiedISBNStatus } from './StaticValue';
import { Title } from './Titles';
import { User } from './user';

export interface ISBN {
  id: number;
  isbnNumber: string;
  image: string;
  type: ISBNType;
  admin: User;
  title: Title[];
  status: VerifiedISBNStatus;
}

export interface createIsbn {
  id?: number;
  isbnNumber: string;
  type: ISBNType;
  titleId: number;
}
export interface ISBNFilter {
  page: number;
  itemsPerPage: number;
  searchStr: string;
}
