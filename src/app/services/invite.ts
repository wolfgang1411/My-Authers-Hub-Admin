import { Injectable } from '@angular/core';
import { Server } from './server';
import { Invite, InviteFilter, InviteListResponse } from '../interfaces/Invite';
import { Logger } from './logger';
import { LoaderService } from './loader';

@Injectable({
  providedIn: 'root',
})
export class InviteService {
  constructor(
    private serverService: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async findOne(code: string) {
    try {
      return await this.serverService.get<Invite>(`invite/${code}`);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async findMany(filter: InviteFilter, showLoader = true) {
    try {
      const params: any = {
        page: filter.page,
        itemsPerPage: filter.itemsPerPage,
      };

      if (filter.type) {
        params.type = filter.type;
      }

      if (filter.userIds && filter.userIds.length > 0) {
        params.userIds = filter.userIds.join(',');
      }

      if (filter.invitedByIds && filter.invitedByIds.length > 0) {
        params.invitedByIds = filter.invitedByIds.join(',');
      }

      const queryString = new URLSearchParams(params).toString();
      const request = this.serverService.get<InviteListResponse>(
        `invite?${queryString}`
      );

      if (showLoader) {
        return await this.loader.loadPromise(request);
      }
      return await request;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async update(token: string, status: string, showLoader = true) {
    try {
      const request = this.serverService.patch<Invite>(`invite/${token}`, {
        status,
      });

      if (showLoader) {
        return await this.loader.loadPromise(request);
      }
      return await request;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
