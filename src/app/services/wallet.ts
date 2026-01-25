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
      return await this.loaderService.loadPromise(
        this.serverService.post<AddWalletAmountResponse>(
          'wallet/amount/add',
          data,
        ),
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }
}
