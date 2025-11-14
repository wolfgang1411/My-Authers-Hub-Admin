import { Injectable } from '@angular/core';
import { Server } from './server';
import { BankDetails, BankOption, createBankDetails } from '../interfaces';
import { Logger } from './logger';
import { LoaderService } from './loader';
import Bank from '../../../public/data/banks.json';

@Injectable({
  providedIn: 'root',
})
export class BankDetailService {
  constructor(
    private serverService: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}
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

  fetchBankOptions() {
    return Bank;
  }
}
