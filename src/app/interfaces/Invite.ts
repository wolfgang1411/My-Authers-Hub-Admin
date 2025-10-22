import { InviteType } from './StaticValue';

export interface Invite {
  email: string;
  type: InviteType;
  userId: number;
}
