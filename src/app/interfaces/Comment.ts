import { User } from './user';

export interface Comment {
  id: number;
  content: string;
  blogId: number;
  authorId: number;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
  };
  replies?: Comment[];
  repliesCount?: number;
}

export interface CreateComment {
  content: string;
  blogId: number;
  parentId?: number;
}

export interface CommentFilter {
  page?: number;
  itemsPerPage?: number;
}

