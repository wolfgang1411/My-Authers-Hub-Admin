import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Pagination } from '../../interfaces';
import {
  Title,
  TitleCategory,
  TitleCreate,
  TitleFilter,
  TitleGenre,
} from '../../interfaces/Titles';
import { Logger } from '../../services/logger';
import { LoaderService } from '../../services/loader';

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async getTitles(filter?: TitleFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<Title>>('titles', filter)
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
        this.server.post<Title>('titles', titleDetails)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
