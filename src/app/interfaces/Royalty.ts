export interface Royalty {
  id: number;
  titleId: number;
  publisherId: number | null;
  authorId: number | null;
  print_mah: number;
  name: string;
  print_third_party: number;
  prime: number;
  ebook_mah: number;
  ebook_third_party: number;
}
export enum RoyaltyStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
  DELETED = 'DELETED',
}
export interface RoyaltyFilter {
  publisherId?: number;
  authorId?: number;
  bookId?: number;
  startDate?: string;
  endDate?: string;
}
