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
  async verifyIsbn(isbn: string): Promise<{ verified: boolean }> {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<{ verified: boolean }>(
          `isbn/verify/${encodeURIComponent(isbn)}`
        )
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
  async createIsbn(isbnDetails: createIsbn) {
    try {
      return await this.loader.loadPromise(
        this.serverService.post('isbn', isbnDetails)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
