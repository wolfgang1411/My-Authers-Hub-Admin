import { Injectable } from '@angular/core';
import { Server } from '../services/server';
import { LoaderService } from './loader';
import { EarningFilter, Pagination } from '../interfaces';
import { CreateRoyalty, Royalty, RoyaltyFilter } from '../interfaces/Royalty';
import { Logger } from './logger';

export interface CalculateRoyaltyItem {
  platformId: number;
  price: number;
  division: string[]; // Array of percentages as strings like ["10", "90"]
}

export interface CalculateRoyaltiesRequest {
  items: CalculateRoyaltyItem[];
  printingPrice?: number; // Printing cost for print platforms
}

export interface CalculateRoyaltiesResponse {
  divisionValue: Array<{
    platformId: number;
    divisionValue: Record<string, number>; // Object like {"10": 20, "90": 180}
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class RoyaltyService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async getRoyalties(filter?: RoyaltyFilter): Promise<Pagination<Royalty>> {
    try {
      return await this.server.get<Pagination<Royalty>>('royalty', filter);
    } catch (error) {
      console.error('Error fetching royalties:', error);
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
      console.error('Error creating royalties:', error);
      throw error;
    }
  }

  async calculateRoyalties(
    request: CalculateRoyaltiesRequest
  ): Promise<CalculateRoyaltiesResponse> {
    try {
      return await this.loader.loadPromise(
        this.server.post<CalculateRoyaltiesResponse>(
          'royalty/calculate',
          request
        ),
        'calculate-royalties',
        true // Hide loader for this frequent call
      );
    } catch (error) {
      console.error('Error calculating royalties:', error);
      throw error;
    }
  }
}
