import { Author, Publishers, Title } from './index';

export enum BlogStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface BlogTitle {
  id: number;
  blogId: number;
  titleId: number;
  title: Title;
  createdAt: string;
}

export interface Blog {
  id: number;
  title: string;
  subTitle?: string | null;
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
  titles?: BlogTitle[];
}

export interface BlogFilter {
  page?: number;
  itemsPerPage?: number;
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
  search?: string;
  status?: BlogStatus | 'ALL';
}

export interface CreateBlog {
  title: string;
  subTitle?: string;
  slug?: string;
  content: string;
  status?: BlogStatus;
  authorId?: number; // For SUPERADMIN to select author (Auther table ID)
  publisherId?: number; // For SUPERADMIN to select publisher (Publisher table ID)
  titleIds?: number[]; // Array of title IDs to associate with the blog
}

export interface UpdateBlog extends Partial<CreateBlog> {
  id: number;
  titleIds?: number[]; // Array of title IDs to associate with the blog
}
