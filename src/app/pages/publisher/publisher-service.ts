import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import {
  DistributionType,
  Media,
  PublisherFilter,
  PublisherMediaType,
  Publishers,
  PublisherStatus,
  PublishingPointCost,
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
  async getPublisherById(id: number, signupCode?: string) {
    try {
      const url = signupCode
        ? `publishers/${id}?signupCode=${signupCode}`
        : `publishers/${id}`;
      return await this.loader.loadPromise(this.server.get<Publishers>(url));
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      this.logger.logError(errorToLog);
      throw error;
    }
  }

  /**
   * Find publisher by invite code (signupCode)
   * Used when accepting invite to check if Dormant publisher exists
   * This endpoint is public and doesn't require authentication
   */
  async findPublisherByInvite(signupCode: string): Promise<Publishers | null> {
    try {
      return await this.loader.loadPromise(
        this.server.get<Publishers>(`publishers/by-invite/${signupCode}`)
      );
    } catch (error) {
      const errorToLog =
        error instanceof HttpErrorResponse && error.status !== 500
          ? error.error
          : error;
      // If publisher not found or not Dormant, return null (not an error)
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 404 || error.status === 400)
      ) {
        return null;
      }
      this.logger.logError(errorToLog);
      return null;
    }
  }

  async createPublisher(publisherData: Publishers, signupCode?: string): Promise<Publishers> {
    try {
      // If signupCode exists, always use POST (create new) - don't use PATCH even if id exists
      // If no signupCode, use PATCH if id exists, POST if no id
      const shouldUsePatch = !signupCode && publisherData.id;
      const url = shouldUsePatch ? `publishers/${publisherData.id}` : 'publishers';
      const method = shouldUsePatch ? 'patch' : 'post';

      // If signupCode exists, remove id from payload to force POST
      const payload = signupCode ? { ...publisherData, id: undefined } : { ...publisherData };

      return await this.loader.loadPromise(
        this.server[method](url, payload)
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
    allowCustomPrintingPrice?: boolean,
    allowAuthorCopyPrice?: boolean
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`publishers/${publisherId}/approve`, {
          data: distributionData,
          allowCustomPrintingPrice: allowCustomPrintingPrice || false,
          allowAuthorCopyPrice: allowAuthorCopyPrice || false,
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
  async fetchPublishingPointCost(publisherId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<PublishingPointCost>>(
          'publisher-point-cost',
          {
            publisherIds: [publisherId],
          }
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
  uploadPublisherImage(
    file: File,
    publisherId: number,
    signupCode?: string
  ): Promise<{ id: number; url: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const { name } = await this.s3Upload.uploadMedia(file);
        const payload: any = {
          keyname: name,
          mime: file.type,
          type: PublisherMediaType.LOGO,
        };
        // Include signupCode in body if present
        if (signupCode) {
          payload.signupCode = signupCode;
        }
        const url = signupCode
          ? `publisher-media/${publisherId}/medias?signupCode=${signupCode}`
          : `publisher-media/${publisherId}/medias`;
        const media = await this.server.post<Media>(url, payload);
        resolve(media);
      } catch (error) {
        this.logger.logError(error);
        reject(error);
      }
    });
  }
  async updateMyImage(file: File, publisherId: number, signupCode?: string) {
    try {
      const media = await this.uploadPublisherImage(file, publisherId, signupCode);
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
      this.logger.logError(error);
      throw error;
    }
  }
}
