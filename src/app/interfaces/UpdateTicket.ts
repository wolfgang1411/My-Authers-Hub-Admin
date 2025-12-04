import { UpdateTicketStatus, UpdateTicketType } from './StaticValue';
import { User } from './user';
import { Author } from './Authors';
import { Publishers } from './Publishers';
import { Address } from './Address';
import { BankDetails } from './BankDetails';

export interface UpdateTicket {
  id: number;
  type: UpdateTicketType;
  status: UpdateTicketStatus;
  data: Record<string, any>;
  currentData?: Record<string, any>;
  requestedBy: User;
  approvedBy?: User;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  authorToUpdate?: Author;
  publisherToUpdate?: Publishers;
  addressToUpdate?: Address;
  bankDetailsToUpdate?: BankDetails;
}

