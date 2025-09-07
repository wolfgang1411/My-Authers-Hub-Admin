import { Injectable } from '@angular/core';
import { Server } from '../services/server';
import { Pagination, Royalty } from '../interfaces';
import { RoyaltyFilter } from '../interfaces/Royalty';
@Injectable({
  providedIn: 'root'
})
export class RoyaltyService {
  constructor(private server: Server) {}


  async  getRoyalties(filter?:RoyaltyFilter): Promise<{ items: Royalty[] }> {
   try {
             return await this.server.get<Pagination<Royalty>>('titles',filter);
           } catch (error) {
             console.error('Error fetching publishers:', error);
             throw error;
           }
  } 
  
}
