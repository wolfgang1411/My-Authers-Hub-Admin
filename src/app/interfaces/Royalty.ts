import { Publisher } from "../pages/publisher/publisher";
import { Author } from "./Authors";
import { ChannalType, Title } from "./Titles";

export interface Royalty {
id          :number;
  percentage  :number;
  channal     :ChannalType;
  title      : Title;         
  author    :  Author  ;
  publisher   : Publisher;
  status     : RoyaltyStatus
}
export enum RoyaltyStatus{
      ACTIVE='ACTIVE',
  DEACTIVE='DEACTIVE',
  DELETED='DELETED'
}
export interface RoyaltyFilter {
  publisherId?: number;
  authorId?: number;
  bookId?: number;
  startDate?: string;
  endDate?: string;
}
