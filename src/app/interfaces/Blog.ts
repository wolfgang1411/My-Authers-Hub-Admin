import { Author, Publishers } from './index';

export enum BlogStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: BlogStatus;
  authorId?: number | null;
  publisherId?: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: Author;
  publisher?: Publishers;
}

export interface BlogFilter {
  page?: number;
  itemsPerPage?: number;
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
  search?: string;
}

export interface CreateBlog {
  title: string;
  slug?: string;
  content: string;
  status?: BlogStatus;
  authorId?: number; // For SUPERADMIN to select author (Auther table ID)
  publisherId?: number; // For SUPERADMIN to select publisher (Publisher table ID)
}

export interface UpdateBlog extends Partial<CreateBlog> {
  id: number;
}
