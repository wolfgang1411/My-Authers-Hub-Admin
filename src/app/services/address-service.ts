import { Injectable } from '@angular/core';
import { Server } from './server';
import { Address } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  constructor(private server : Server){
  }

  async createOrUpdateAddress(address : Address)
  {
    try{
      return await this.server[address.id ? 'patch' : 'post'](address.id ?`address/${address.id}` : 'address', {...address}) 
    }
    catch(error)
    {
      throw error
    }
  }
}
