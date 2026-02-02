import { inject, Injectable } from '@angular/core';
import { LoaderService } from './loader';
import { Server } from './server';
import { Logger } from './logger';
import { AddWalletAmount, AddWalletAmountResponse } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  serverService = inject(Server);
  loaderService = inject(LoaderService);
  loggerService = inject(Logger);

  async addWalletAmount(data: AddWalletAmount) {
    try {
      return await this.loaderService.loadPromise<{
        amount: number;
        currency: string;
        orderId: string;
        status: 'pending' | 'success';
        tnx: number;
      }>(this.serverService.post('wallet/amount/add', data));
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async verifyWalletAmountTransaction(
    response: RazorpayPaymentResponse & {
      status: 'completed' | 'failed' | 'cancelled';
    },
  ) {
    try {
      return await this.loaderService.loadPromise<{
        status: 'completed' | 'failed' | 'cancelled';
      }>(this.serverService.post('razarpay/wallet/response', response));
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }
}
