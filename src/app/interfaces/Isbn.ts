import { Title } from './Titles';
import { User } from './user';

export interface ISBN {
  id: number;
  isbnNumber: String;
  image: string;
  type: IsbnType;
  admin: User;
  title: Title[];
  status: IsbnStatus;
}

export interface createIsbn {
  isbnNumber: string;
  type: IsbnType;
  titleId: number;
}
export interface ISBNFilter {
  page: number;
  itemsPerPage: number;
  searchStr: string;
}
export enum IsbnType {
  'PRINT' = 'PRINT',
  'EBOOK' = 'EBOOK',
}
export enum IsbnStatus {
  'ACTIVE' = 'ACTIVE',
  'DELETED' = 'DELETED',
}
