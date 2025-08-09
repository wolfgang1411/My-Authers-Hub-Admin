import { BankDetails } from "./BankDetails";

export interface Publishers 
    {
name: string;
id: number;
email: string;
address: string;
phoneNumber: string;
noOftitles:number;
noOfauthors:number;
companyName: string;
publisherDesignation: string;
companyContactNumber: string;
companyEmailId: string;
publisherProfileLink?: string; // Optional link to the publisher's profile
links: string[]; // Array of links related to the publisher
attachments?: any[];
 bankDetails?:BankDetails[]; // Optional attachments related to the publisher
    }
