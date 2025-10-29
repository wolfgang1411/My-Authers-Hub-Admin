import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import {
  DistributionType,
  Media,
  Pagination,
  Royalty,
  TitleMediaType,
  UpdateRoyalty,
} from '../../interfaces';
import {
  ApproveTitlePayload,
  PricingCreate,
  PrintingCreate,
  Title,
  TitleCategory,
  TitleCreate,
  TitleFilter,
  TitleGenre,
  TitlePricing,
  TitlePrinting,
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

  async approveTitle(id: number, data: ApproveTitlePayload[]) {
    try {
      return await this.loader.loadPromise(
        this.server.patch<Title>(`titles/${id}/approve`, {
          data,
        })
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
          if (val && val.length) {
            temp[key] = val;
          }
        });
      }

      return await this.loader.loadPromise(
        this.server.get<Pagination<Title>>('titles', temp)
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
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
  async getTitleById(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Title>(`titles/${id}`)
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
  async getSubcategory(categoryId: number) {
    try {
      return await this.server.get<Pagination<TitleCategory>>('category', {
        parentIds: categoryId,
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
      return await this.server.post<Media>(`title-media/${titleId}/medias`, {
        keyname: key,
        type: data.type,
        autoDeleteOldIfExisit: true,
      });
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
