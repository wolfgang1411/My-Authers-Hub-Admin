import { Injectable } from '@angular/core';
import { Server } from '../services/server';
import { Pagination } from '../interfaces';
import { CreateRoyalty, Royalty, RoyaltyFilter } from '../interfaces/Royalty';
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
  async createRoyalties(royalties: CreateRoyalty[]): Promise<CreateRoyalty[]> {
    try {
      const responses = await Promise.all(
        royalties.map((royalty) =>
          this.server.post<CreateRoyalty>('royalty', royalty)
        )
      );
      return responses;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
