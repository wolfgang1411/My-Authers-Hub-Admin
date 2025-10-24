import { PlatForm } from './StaticValue';

export interface SalesFilter {
  itemsPerPage?: number;

  page?: number;

  soldBefore?: string;

  soldAfter?: string;

  titleIds?: number[];

  authorIds?: number[];

  publisherIds?: number[];

  platforms?: PlatForm | PlatForm[];

  channals?: string | string[];

  userId?: number;
}
