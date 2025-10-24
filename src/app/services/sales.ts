import { Injectable } from '@angular/core';
import { Server } from './server';
import { LoaderService } from './loader';
import { Logger } from './logger';
import { SalesFilter } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  constructor(
    private server: Server,
    private loader: LoaderService,
    private logger: Logger
  ) {}

  async fetchSalesCount(filter: SalesFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<{ copiesSold: number; totalAmount: number }>(
          'sales/count/total',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
