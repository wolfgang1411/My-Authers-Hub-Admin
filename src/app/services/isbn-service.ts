import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { createIsbn, ISBN, ISBNFilter, Pagination } from '../interfaces';
import { LoaderService } from './loader';

@Injectable({
  providedIn: 'root',
})
export class IsbnService {
  constructor(
    private serverService: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}
  async verifyIsbn(
    isbn: string,
    titleName?: string
  ): Promise<{ verified: boolean }> {
    try {
      const params: any = {};
      if (titleName && titleName.trim()) {
        params.titleName = titleName;
      }
      return await this.loader.loadPromise(
        this.serverService.get<{ verified: boolean }>(
          `isbn/verify/${encodeURIComponent(isbn)}`,
          params
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async generateEbookISBN(titleName: string) {
    try {
      return await this.loader.loadPromise(
        this.serverService.post<{ code: string }>(`isbn/ebook/generate`, {
          titleName,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getAllISBN(filter: ISBNFilter): Promise<Pagination<ISBN>> {
    try {
      return await this.loader.loadPromise(
        this.serverService.get('isbn', filter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async downloadBarCode(isbnNumber: string) {
    try {
      return await this.loader.loadPromise(
        this.serverService.getDocument(`isbn/download`, {
          isbnNumber: isbnNumber,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async createOrUpdateIsbn(isbnDetails: createIsbn) {
    try {
      const url = isbnDetails.id ? `isbn/${isbnDetails.id}` : 'isbn';
      const method = isbnDetails.id ? 'patch' : 'post';
      return await this.loader.loadPromise(
        this.serverService[method]<ISBN>(url, isbnDetails)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async getISBNCount(filter: ISBNFilter) {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<{ count: number }>('isbn/count', filter)
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }
}
