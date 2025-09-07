import { Injectable } from '@angular/core';
import { Server } from './server';
import { Invite } from '../interfaces/Invite';

@Injectable({
  providedIn: 'root',
})
export class InviteService {
  constructor(private serverService: Server) {}

  async findOne(code: string) {
    try {
      return await this.serverService.get<Invite>(`invite/${code}`);
    } catch (error) {
      throw error;
    }
  }
}
