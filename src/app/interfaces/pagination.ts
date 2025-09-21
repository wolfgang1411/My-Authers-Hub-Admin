export type Pagination<T> = {
  items: T[];
  itemsPerPage: number;
  page: number;
  totalCount: number;
};

export interface BasicFilter {
  itemsPerPage?: number;
  page?: number;
}
