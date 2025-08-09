import { BankDetails } from "./BankDetails";
import { Media } from "./Media";
import { Titles } from "./Titles";

export interface Author {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  titles: Titles[]; 
  royalty: number; // Total royalty earned by the author
  profileLink?: string; // Optional link to the author's profile
 username : string;
 about :string;
 authorMedia : Media[];
 bankDetails?:BankDetails[];
 links : string[];
}