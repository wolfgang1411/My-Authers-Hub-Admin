import { Injectable } from '@angular/core';
import { Server } from './server';
import { Invite } from '../interfaces/Invite';
import { Logger } from './logger';

@Injectable({
  providedIn: 'root',
})
export class InviteService {
  constructor(private serverService: Server, private logger: Logger) {}

  async findOne(code: string) {
    try {
      return await this.serverService.get<Invite>(`invite/${code}`);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
