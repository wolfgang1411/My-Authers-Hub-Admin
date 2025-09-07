import { Injectable } from '@angular/core';
import { Server } from './server';
import { BankDetails, createBankDetails } from '../interfaces';
import { Logger } from './logger';

@Injectable({
  providedIn: 'root',
})
export class BankDetailService {
  constructor(private serverService: Server, private logger: Logger) {}
  async createOrUpdateBankDetail(
    bankDetail: createBankDetails
  ): Promise<BankDetails> {
    try {
      return await this.serverService[bankDetail.id ? 'patch' : 'post'](
        bankDetail.id ? `bank-details/${bankDetail.id}` : 'bank-details',
        bankDetail
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
