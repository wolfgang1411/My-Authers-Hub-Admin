import { Author } from './Authors';
import { ISBN } from './Isbn';
import { TitleStatus } from './StaticValue';

export interface Books {
  id: number;
  name: string;
  status: TitleStatus;
  publishedAt: string;
  booksSold: number;
  printingPrice: number;
  price: number;
  salePrice: number;
  language: string;
  pages: number;
  productForm: string;
  distributionType: string;
  author: Author;
  isbn: ISBN;
  createdAt: string;
  updatedAt: string;
}

export interface Title {
  id: number;
  name: string;
  status: TitleStatus;
  publishedAt: string;
  booksSold: number;
  printingPrice: number;
  price: number;
  salePrice: number;
  language: string;
  pages: number;
  productForm: string;
  distributionType: string;
  author: Author;
  isbnId: number;
  createdAt: string;
  updatedAt: string;
}
