import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Logger } from '../../services/logger';
import { LoaderService } from '../../services/loader';
import { Pagination } from '../../interfaces';

export interface SharedTitle {
  id: number;
  titleId: number;
  code: string;
  sharedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  title: {
    id: number;
    name: string;
  };
}

export interface SharedTitleMedia {
  id: number;
  name: string;
  type: string;
  noOfPages: number;
  url: string;
}

export interface SharedTitleMediaResponse {
  title: {
    id: number;
    name: string;
  };
  media: SharedTitleMedia[];
}

@Injectable({
  providedIn: 'root',
})
export class SharedTitlesService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async getSharedTitles(filter?: {
    page?: number;
    itemsPerPage?: number;
  }): Promise<Pagination<SharedTitle>> {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<SharedTitle>>('shared-titles', filter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getSharedTitleById(id: number): Promise<SharedTitle> {
    try {
      return await this.loader.loadPromise(
        this.server.get<SharedTitle>(`shared-titles/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createSharedTitle(titleId: number): Promise<SharedTitle> {
    try {
      return await this.loader.loadPromise(
        this.server.post<SharedTitle>('shared-titles', { titleId })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async deleteSharedTitle(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.delete(`shared-titles/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getMediaByCode(code: string): Promise<SharedTitleMediaResponse> {
    try {
      // Public endpoint - call directly without loader
      return await this.server.get<SharedTitleMediaResponse>(
        `shared-titles/media/${code}`
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
