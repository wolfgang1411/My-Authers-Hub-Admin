import { Injectable } from '@angular/core';
import { Server } from './server';
import { LoaderService } from './loader';
import { Logger } from './logger';
import {
  CreateSale,
  EarningFilter,
  Pagination,
  SalesByPlatform,
  SalesByPlatformFilter,
  SalesFilter,
} from '../interfaces';
import { Earnings } from '../interfaces/Earnings';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  constructor(
    private server: Server,
    private loader: LoaderService,
    private logger: Logger,
  ) {}

  async fetchEarnings(filter: EarningFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<Earnings>>('earnings', filter),
        'fetching-earnings',
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchSalesCount(filter: SalesFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<{ copiesSold: number; totalAmount: number }>(
          'sales/count/total',
          filter,
        ),
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createSalesMulti(data: CreateSale[]) {
    try {
      return await this.loader.loadPromise(
        this.server.post('sales/new', { data }),
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getEarningsCount(filter: EarningFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<{ count: number }>('earnings/count', filter),
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }

  async fetchSalesByPlatform(filter: SalesByPlatformFilter) {
    try {
      return await this.loader.loadPromise<SalesByPlatform[]>(
        this.server.get('sales/platform/total', filter),
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async exportEarnings(filter: EarningFilter) {
    try {
      const response = await this.loader.loadPromise(
        this.server.getDocument('earnings/export', filter),
        'exporting-earnings',
      );
      
      const blob = response.body;
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'earnings.csv';
      if (contentDisposition) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
