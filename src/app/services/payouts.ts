import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Pagination } from '../interfaces';
import { Payout, PayoutFilter, PayoutStatus } from '../interfaces/Payout';

@Injectable({
  providedIn: 'root',
})
export class PayoutsService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async fetchPayouts(filter: PayoutFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<Payout>>('wallet-request', filter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchPayout(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Payout>(`wallet-request/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async updatePayout(
    id: number,
    data: { status: PayoutStatus; refundHoldAmount?: boolean }
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.patch<Payout>(`wallet-request/${id}`, data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async requestPayout(data: { requestedAmount: number }) {
    try {
      return await this.loader.loadPromise(
        this.server.post<Payout>('wallet-request', data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
