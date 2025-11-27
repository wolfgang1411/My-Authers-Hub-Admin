import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import {
  DistributionType,
  Media,
  PublisherFilter,
  PublisherMediaType,
  Publishers,
  PublisherStatus,
  PublishingPoints,
} from '../../interfaces';
import { Pagination, PublishingType } from '../../interfaces';
import { Invite } from '../../interfaces/Invite';
import { Logger } from '../../services/logger';
import { LoaderService } from '../../services/loader';
import { Distribution } from '../../interfaces/Distribution';
import { HttpErrorResponse } from '@angular/common/http';
import { S3Service } from 'src/app/services/s3';

@Injectable({
  providedIn: 'root',
})
export class PublisherService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService,
    private s3Upload: S3Service
  ) {}

  async getPublishers(filter?: PublisherFilter, showLoader = true) {
    try {
      filter = { ...filter };
      if (filter && (!filter.status || filter.status === ('ALL' as any))) {
        delete filter.status;
      }
      return await this.loader.loadPromise(
        this.server.get<Pagination<Publishers>>('publishers', filter),
        'fetch-publisher',
        !showLoader
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
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
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
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
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }
  async updatePublisherStatus(
    { status }: { status: PublisherStatus; delinkTitle?: boolean },
    publisherId: number
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.patch(`publishers/${publisherId}/status`, {
          status: status,
        })
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }
  async sendInviteLink(invite: Invite) {
    try {
      return await this.loader.loadPromise(
        this.server.post('publishers/invite', invite)
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }
  async approvePublisher(
    distributionData: Distribution[],
    publisherId: number,
    allowCustomPrintingPrice?: boolean
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`publishers/${publisherId}/approve`, {
          data: distributionData,
          allowCustomPrintingPrice: allowCustomPrintingPrice || false,
        })
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }

  async rejectPublisher(publisherId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`publishers/${publisherId}/reject`, {})
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }

  buyPublishingPoints(
    distributionType: DistributionType,
    points: number,
    returnUrl: string,
    publisherId?: number
  ) {
    try {
      return this.loader.loadPromise(
        this.server.post<{
          url?: string;
          status: 'pending' | 'success';
          id: number;
        }>('publishing-points/buy', {
          distributionType,
          points,
          publisherId,
          returnUrl,
        })
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }

  async fetchPublishingPoints(publisherId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<PublishingPoints>>('publishing-points', {
          publisherIds: [publisherId],
        })
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }
  uploadPublisherImage(
    file: File,
    publisherId: number
  ): Promise<{ id: number; url: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const { name } = await this.s3Upload.uploadMedia(file);
        const media = await this.server.post<Media>(
          `publisher-media/${publisherId}/medias`,
          {
            keyname: name,
            mime: file.type,
            type: PublisherMediaType.LOGO,
          }
        );
        resolve(media);
      } catch (error) {
        this.logger.logError(error);
        reject(error);
      }
    });
  }
  async updateMyImage(file: File, publisherId: number) {
    try {
      const media = await this.uploadPublisherImage(file, publisherId);
      return media;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async removeImage(mediaId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.delete(`publisher-media/medias/${mediaId}`)
      );
    } catch (error) {
      throw error;
      this.logger.logError(error);
    }
  }
}
