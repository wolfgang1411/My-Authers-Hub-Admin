import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Pagination, TitleConfig, TitleConfigFilter } from '../interfaces';

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
}
