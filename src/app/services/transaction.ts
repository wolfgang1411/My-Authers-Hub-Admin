import { Injectable } from '@angular/core';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Server } from './server';
import { Pagination, Transaction, TransactionFilter } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  constructor(
    private serverService: Server,
    private loggerService: Logger,
    private loaderService: LoaderService
  ) {}

  async fetchTransactions(filter: TransactionFilter) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.get<Pagination<Transaction>>('transactions', filter)
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async fetchTransaction(id: string) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.get<Transaction>(`transactions/${id}`)
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async createTransaction(orderId: number) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.post<{ url: string }>('transactions', {
          orderId,
        }),
        'createTransaction'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }
}
