import { Injectable } from '@angular/core';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Server } from './server';
import {
  Invoice,
  Pagination,
  Transaction,
  TransactionFilter,
} from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  constructor(
    private serverService: Server,
    private loggerService: Logger,
    private loaderService: LoaderService,
  ) {}

  async fetchTransactions(filter: TransactionFilter) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.get<Pagination<Transaction>>('transactions', filter),
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async fetchTransaction(id: string) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.get<Transaction>(`transactions/${id}`),
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async createTransaction(orderId: number) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.post<{
          amount: number;
          currency: string;
          orderId: string;
          status: 'pending' | 'success';
          tnx: number;
        }>('transactions', {
          orderId,
        }),
        'createTransaction',
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async getInvoice(id: number) {
    try {
      return await this.loaderService.loadPromise<Invoice>(
        this.serverService.get(`transactions/${id}/invoice`),
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async verfiyTransactionPayment(
    response: RazorpayPaymentResponse & {
      status: 'completed' | 'failed' | 'cancelled';
    },
  ) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.post('razarpay/response', response),
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }
}
