import { Injectable } from '@angular/core';
import { Server } from './server';
import { Address } from '../interfaces';
import { Logger } from './logger';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  constructor(private server: Server, private logger: Logger) {}

  async createOrUpdateAddress(address: Address) {
    try {
      return await this.server[address.id ? 'patch' : 'post'](
        address.id ? `address/${address.id}` : 'address',
        { ...address }
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async validatePincode(pincode: string, countryCode = 'IN') {
    try {
      return await this.server.get<{ valid: boolean }>(
        `address/verify/${countryCode}/${pincode}`
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
