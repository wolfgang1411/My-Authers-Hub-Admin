import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import {
  DistributionType,
  EarningFilter,
  ISBNFilter,
  Media,
  Pagination,
  Royalty,
  TitleMediaType,
  UpdateRoyalty,
} from '../../interfaces';
import {
  ApproveTitlePayload,
  createOrUpdateCategory,
  PricingCreate,
  PrintingCreate,
  Title,
  TitleCategory,
  TitleCreate,
  TitleDistribution,
  TitleDistributionFilter,
  TitleDistributionUpdateTicket,
  TitleFilter,
  TitleGenre,
  TitleMediaUpdateTicket,
  TitlePricing,
  TitlePrinting,
  TitlePrintingUpdateTicket,
  TitleUpdateTicket,
  PricingUpdateTicket,
  RoyaltyUpdateTicket,
  CreatePlatformIdentifier,
} from '../../interfaces/Titles';
import { Logger } from '../../services/logger';
import { LoaderService } from '../../services/loader';
import { Pricing } from '../../components/pricing/pricing';
import { S3Service } from '../../services/s3';

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService,
    private s3Service: S3Service
  ) {}

  async deleteTitle(id: number) {
    try {
      return await this.loader.loadPromise(this.server.delete(`titles/${id}`));
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getTitleWithLessDetails(filter?: TitleFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<Title>>('titles/miminum', filter)
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }

  async rejectTitle(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Title>(`titles/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveTitle(id: number, data: ApproveTitlePayload) {
    try {
      return await this.loader.loadPromise(
        this.server.patch<Title>(`titles/${id}/approve`, data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getTitles(filter?: TitleFilter) {
    try {
      const temp: any = {};

      if (filter) {
        Object.keys(filter).forEach((key) => {
          const val = (filter as any)[key];

          if (
            (Array.isArray(val) && val.length) ||
            typeof val === 'number' ||
            typeof val === 'boolean' ||
            (typeof val === 'string' && val.trim() !== '')
          ) {
            temp[key] = val;
          }
        });
      }

      return await this.loader.loadPromise(
        this.server.get<Pagination<Title>>('titles', temp)
      );
    } catch (error) {
      console.error('Error fetching titles:', error);
      throw error;
    }
  }

  async getTitleCount(filter: TitleFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<{ count: number }>('titles/count', filter)
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }

  // Initialization logic can gp here if needed
  async getTitleById(id: number, showPlatformSales: boolean = false) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Title>(`titles/${id}`, { showPlatformSales })
      );
    } catch (error) {
      console.error(`Error fetching title with id ${id}:`, error);
      throw error;
    }
  }
  async getTitleCategory() {
    try {
      return await this.server.get<Pagination<TitleCategory>>('category', {
        type: 'CATEGORY',
      });
    } catch (error) {
      console.error('Error fetching:', error);
      throw error;
    }
  }
  async getGenre() {
    try {
      return await this.server.get<Pagination<TitleGenre>>('genre');
    } catch (error) {
      console.error('Error fetching:', error);
      throw error;
    }
  }
  async getSubcategory(categoryId?: number) {
    try {
      return await this.server.get<Pagination<TitleCategory>>('category', {
        parentIds: categoryId ? categoryId : [],
        type: 'SUBCATEGORY',
      });
    } catch (error) {
      console.error('Error fetching:', error);
      throw error;
    }
  }
  async getTradeCategory() {
    try {
      return await this.server.get<Pagination<TitleCategory>>('category', {
        type: 'TRADE',
      });
    } catch (error) {
      throw error;
    }
  }

  async createOrUpdateCategory(data: createOrUpdateCategory) {
    try {
      const method = data.id ? 'patch' : 'post';
      const url = data.id ? `category/${data.id}` : 'category';
      return this.loader.loadPromise(
        this.server[method]<TitleCategory>(url, data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createOrUpdateGenre(data: createOrUpdateCategory) {
    try {
      const method = data.id ? 'patch' : 'post';
      const url = data.id ? `genre/${data.id}` : 'genre';
      return this.loader.loadPromise(
        this.server[method]<TitleCategory>(url, data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async deleteCategory(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.delete(`category/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async deleteGenre(id: number) {
    try {
      return await this.loader.loadPromise(this.server.delete(`genre/${id}`));
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createTitle(titleDetails: TitleCreate): Promise<Title> {
    try {
      return await this.loader.loadPromise(
        this.server[titleDetails.id ? 'patch' : 'post']<Title>(
          titleDetails.id ? `titles/${titleDetails.id}` : 'titles',
          titleDetails
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createTitleUpdateTicket(
    titleId: number,
    titleDetails: Partial<TitleCreate>
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`title-update-ticket/title/${titleId}`, titleDetails)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createTitlePrintingUpdateTicket(
    titleId: number,
    printingData: Partial<PrintingCreate>
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(
          `title-printing-update-ticket/title/${titleId}`,
          printingData
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createPricingUpdateTicket(
    titleId: number,
    pricingData: { data: PricingCreate[] }
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`pricing-update-ticket/title/${titleId}`, pricingData)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createRoyaltyUpdateTicket(
    titleId: number,
    royaltyData: { royalties: UpdateRoyalty[] }
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`royalty-update-ticket/title/${titleId}`, royaltyData)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createTitleMediaUpdateTicket(
    titleId: number,
    mediaData: { keyname: string; type: TitleMediaType }
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(
          `title-media-update-ticket/${titleId}/medias`,
          mediaData
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async uploadMediaForUpdateTicket(
    titleId: number,
    data: { file: File; type: TitleMediaType }
  ) {
    try {
      const { key, url } = await this.s3Service.getS3Url(
        data.file.name,
        data.file.type
      );
      await this.s3Service.putS3Object(url, data.file);
      return await this.createTitleMediaUpdateTicket(titleId, {
        keyname: key,
        type: data.type,
      });
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async uploadMultiMediaForUpdateTicket(
    titleId: number,
    data: { file: File; type: TitleMediaType }[]
  ) {
    return await Promise.all(
      data.map((d) => this.uploadMediaForUpdateTicket(titleId, d))
    );
  }

  async createTitleDistributionUpdateTicket(
    titleId: number,
    distributions: DistributionType[]
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`title-distribution-update-ticket/title/${titleId}`, {
          distributions,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createUpdateTitlePlatformIdentifier(
    titleId: number,
    data: {
      platformIdentifier: CreatePlatformIdentifier[];
    }
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`title-platform-identifier/title/${titleId}`, {
          data: data.platformIdentifier,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async updateTitle(id: number, data: Partial<Title>) {
    try {
      return await this.loader.loadPromise(
        this.server.patch<Title>(`titles/${id}`, data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createOrUpdatePrinting(data: PrintingCreate) {
    try {
      const method = data.id ? 'patch' : 'post';
      const url = data.id ? `title-printing/${data.id}` : 'title-printing';
      delete data.id;
      return this.loader.loadPromise(
        this.server[method]<TitlePrinting>(url, data),
        'updating-printing'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  createOrUpdatePricing(data: PricingCreate) {
    try {
      const method = data.id ? 'patch' : 'post';
      const url = data.id ? `pricing/${data.id}` : 'pricing';
      delete data.id;
      return this.loader.loadPromise(
        this.server[method]<TitlePricing>(url, data)
      );
    } catch (error) {
      throw error;
    }
  }

  async createManyPricing(data: PricingCreate[], titleId: number) {
    try {
      return await this.loader.loadPromise<Pricing[]>(
        this.server.post(`pricing/title/${titleId}/multi`, { data })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createOrUpdateRoyaties(data: UpdateRoyalty) {
    try {
      data = { ...data };
      const method = data.id ? 'patch' : 'post';
      const url = data.id ? `royalty/${data.id}` : 'royalty';
      delete data.id;
      return await this.loader.loadPromise(
        this.server[method]<Royalty>(url, data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createManyRoyalties(royalties: UpdateRoyalty[], titleId: number) {
    try {
      return this.loader.loadPromise(
        this.server.post('royalty/multi', {
          royalties,
          titleId,
        }),
        'create-many-royalties'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createTitleDistribution(
    titleId: number,
    distributions: DistributionType[]
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`title-distribution/title/${titleId}`, {
          distributions,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchTitleDistribution(filter: TitleDistributionFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<TitleDistribution>>(
          'title-distribution',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async uploadMultiMedia(
    titleId: number,
    data: { file: File; type: TitleMediaType }[]
  ) {
    return await Promise.all(data.map((d) => this.uploadMedia(titleId, d)));
  }

  async uploadMedia(
    titleId: number,
    data: { file: File; type: TitleMediaType }
  ) {
    try {
      const { key, url } = await this.s3Service.getS3Url(
        data.file.name,
        data.file.type
      );
      await this.s3Service.putS3Object(url, data.file);
      return await this.loader.loadPromise(
        this.server.post<Media>(`title-media/${titleId}/medias`, {
          keyname: key,
          type: data.type,
          autoDeleteOldIfExisit: true,
        }),
        'upload-media'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  // Update Ticket Methods
  async getTitleUpdateTickets(filter?: any) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<TitleUpdateTicket>>(
          'title-update-ticket',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getTitlePrintingUpdateTickets(filter?: any) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<TitlePrintingUpdateTicket>>(
          'title-printing-update-ticket',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getPricingUpdateTickets(filter?: any) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<PricingUpdateTicket>>(
          'pricing-update-ticket',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getRoyaltyUpdateTickets(filter?: any) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<RoyaltyUpdateTicket>>(
          'royalty-update-ticket',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getTitleMediaUpdateTickets(filter?: any) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<TitleMediaUpdateTicket>>(
          'title-media-update-ticket',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getTitleDistributionUpdateTickets(filter?: any) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<TitleDistributionUpdateTicket>>(
          'title-distribution-update-ticket',
          filter
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveTitleUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-update-ticket/${id}/approve`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectTitleUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-update-ticket/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveTitlePrintingUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-printing-update-ticket/${id}/approve`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectTitlePrintingUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-printing-update-ticket/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approvePricingUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`pricing-update-ticket/${id}/approve`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectPricingUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`pricing-update-ticket/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveRoyaltyUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`royalty-update-ticket/${id}/approve`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectRoyaltyUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`royalty-update-ticket/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveTitleMediaUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-media-update-ticket/${id}/approve`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectTitleMediaUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-media-update-ticket/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveTitleDistributionUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-distribution-update-ticket/${id}/approve`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectTitleDistributionUpdateTicket(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get(`title-distribution-update-ticket/${id}/reject`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
