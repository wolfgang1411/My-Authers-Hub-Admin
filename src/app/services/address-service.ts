import { Injectable } from '@angular/core';
import { Server } from './server';
import { Address, PostalCode } from '../interfaces';
import { Logger } from './logger';
import { getDetails } from 'indian-pincode-validator';
import { State } from 'country-state-city';
import { LoaderService } from './loader';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  constructor(private server: Server, private logger: Logger, private loader: LoaderService) { }

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

  async validatePincode(pincode: string, stateCode: string) {
    try {
      const res = getDetails(pincode);
      const stateName = State.getStateByCodeAndCountry(stateCode, 'IN')?.name;

      if (!res.state?.length) {
        return await this.server.get<{ valid: boolean }>(
          `address/verify/${pincode}/${stateName}`
        );
      }

      if (res.state.toLowerCase() !== stateName?.toLowerCase()) {
        return {
          valid: false,
        };
      }

      return {
        valid: true,
      };
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  // async tempValidatePincode(pincode: string, state: string) {
  //   try {
  //     const res = getDetails(pincode);
  //     const stateName = State.getStateByCodeAndCountry(state, 'IN')?.name;

  //     if (!res?.state?.length) {
  //       const res = await this.server.get(
  //         `https://api.postalpincode.in/postoffice/${pincode}`
  //       );
  //     }

  //     if (res.state.toLowerCase() !== stateName?.toLowerCase()) {
  //     }
  //     return {
  //       valid: false,
  //     };
  //   } catch (error) {
  //     console.log(error);
  //     return {
  //       valid: false,
  //     };
  //   }
  // }


  async fetchPincodeDetails(pincode: string, showError = true) {
    try {
      return await this.server.get<PostalCode>(`postal-codes/search/${pincode}`)
    } catch (error) {
      if (showError) {
        this.logger.logError(error)
      }
      throw error
    }
  }
}
