import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import {
  CreateTitleConfig,
  Pagination,
  TitleConfig,
  TitleConfigFilter,
  TitleConfigType,
} from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class TitleConfigService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async fetchTitleConfigs(filter: TitleConfigFilter) {
    try {
      const response = await this.loader.loadPromise(
        this.server.get<Pagination<TitleConfig>>('title-config', filter)
      );
      return response;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async deleteTitlConfig(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.delete(`title-config/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createTitleConfig(data: CreateTitleConfig) {
    try {
      return await this.loader.loadPromise(
        this.server.post<TitleConfig>('title-config', data)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async reorderTitleConfig(
    type: TitleConfigType,
    data: { id: number; position: number }[]
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.patch(`title-config/reorder/${type}`, { data })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
