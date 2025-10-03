import { Injectable } from '@angular/core';
import { Server } from '../services/server';
import { Pagination } from '../interfaces';
import { Royalty, RoyaltyFilter } from '../interfaces/Royalty';
import { Logger } from './logger';
@Injectable({
  providedIn: 'root',
})
export class RoyaltyService {
  constructor(private server: Server, private logger: Logger) {}

  async getRoyalties(filter?: RoyaltyFilter): Promise<Pagination<Royalty>> {
    try {
      return await this.server.get<Pagination<Royalty>>('royalty', filter);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
