export type Pagination<T> = {
  items: T[];
  itemsPerPage: number;
  page: number;
  totalCount: number;
};
