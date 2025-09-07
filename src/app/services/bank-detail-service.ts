import { Injectable } from '@angular/core';
import { Server } from './server';
import { BankDetails, createBankDetails } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class BankDetailService {
  constructor(private serverService : Server)
  {}
  async createOrUpdateBankDetail
  (bankDetail : createBankDetails) : Promise<BankDetails>
  {
  try {
    return await this.serverService[bankDetail.id ? 'patch' : 'post'](bankDetail.id ? `bank-details/${bankDetail.id}` : 'bank-details', 
      bankDetail
    );
  }
  catch(error)
  {
    // Optionally handle/log error here
    return Promise.reject(error);
  }

  }
}
