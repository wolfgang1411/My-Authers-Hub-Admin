import { Injectable } from '@angular/core';
import { Server } from './server';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IsbnService {
  constructor(private serverService : Server)
  {
  }
  async verifyIsbn(isbn: string):Promise<{verified:boolean}> {
    try{
     return await this.serverService.get<{verified:boolean}>(
        `isbn/verify/${encodeURIComponent(isbn)}`
      );
    }
    catch(error)
    {
     throw error
    }
  }
}
