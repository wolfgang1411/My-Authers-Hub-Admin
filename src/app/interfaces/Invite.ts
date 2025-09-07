export interface Invite{
    email : string;
    type 
    : InviteType;
    userId: number;
}
export enum InviteType {
      PUBLISHER= 'PUBLISHER',
  AUTHER= 'AUTHER'
}