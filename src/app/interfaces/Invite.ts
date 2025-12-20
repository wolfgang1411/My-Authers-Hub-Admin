import { InviteType, InviteStatus } from './StaticValue';
import { User } from './user';

export interface Invite {
  id: number;
  email: string;
  type: InviteType;
  status: InviteStatus;
  token: string;
  userId?: number;
  invitedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    accessLevel: string;
    publisher?: {
      id: number;
      name: string;
      type: string;
    };
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    accessLevel: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface InviteFilter {
  page: number;
  itemsPerPage: number;
  type?: InviteType;
  userIds?: number[];
  invitedByIds?: number[];
}

export interface InviteListResponse {
  totalCount: number;
  items: Invite[];
  page: number;
  itemsPerPage: number;
}
