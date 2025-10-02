import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import {
  PublisherFilter,
  Publishers,
  PublisherStatus,
} from '../../interfaces/Publishers';
import { Pagination } from '../../interfaces';
import { Invite } from '../../interfaces/Invite';
import { Logger } from '../../services/logger';
import { LoaderService } from '../../services/loader';
import { Distribution } from '../../interfaces/Distribution';

@Injectable({
  providedIn: 'root',
})
export class PublisherService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async getPublishers(filter?: PublisherFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<Publishers>>('publishers', filter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  // Initialization logic can gp here if needed
  async getPublisherById(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Publishers>(`publishers/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createPublisher(publisherData: Publishers): Promise<Publishers> {
    try {
      return await this.loader.loadPromise(
        this.server[publisherData.id ? 'patch' : 'post'](
          publisherData.id ? `publishers/${publisherData.id}` : 'publishers',
          { ...publisherData }
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async updatePublisherStatus(status: PublisherStatus, publisherId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.patch(`publishers/${publisherId}`, {
          status: status,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async sendInviteLink(invite: Invite) {
    try {
      return await this.loader.loadPromise(
        this.server.post('publishers/invite', invite)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async approvePublisher(
    distributionData: Distribution[],
    publisherId: number
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`publishers/${publisherId}/approve`, {
          data: distributionData,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectPublisher(publisherId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`publishers/${publisherId}/reject`, {})
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
