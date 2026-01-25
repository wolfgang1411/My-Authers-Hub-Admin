import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import {
  WalletamountTransaction,
  WalletAmountTransactionFilter,
} from '../interfaces/WalletTransaction';
import { Pagination } from '../interfaces';
import { WalletAmountTransaction } from '../pages/wallet-amount-transaction/wallet-amount-transaction';

@Injectable({
  providedIn: 'root',
})
export class WalletTransaction {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService,
  ) {}

  async fetchWalletTransactions(filter: WalletAmountTransactionFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<WalletamountTransaction>>(
          'wallet-amount-transaction',
          filter,
        ),
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchWalletTransaction(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<WalletamountTransaction>(
          `wallet-amount-transaction/${id}`,
        ),
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
