import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Pagination } from '../../interfaces';
import { Author, AuthorFilter, AuthorStatus } from '../../interfaces/Authors';
import { Logger } from '../../services/logger';
import { LoaderService } from '../../services/loader';

@Injectable({
  providedIn: 'root',
})
export class AuthorsService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async getAuthors(filter?: AuthorFilter) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<Author>>('authors', filter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async getAuthorrById(id: number) {
    try {
      return await this.loader.loadPromise(
        this.server.get<Author>(`authors/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createAuthor(authorData: Author): Promise<Author> {
    try {
      return await this.loader.loadPromise(
        this.server[authorData.id ? 'patch' : 'post'](
          authorData.id ? `authors/${authorData.id}` : 'authors',
          { ...authorData }
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async approveAuthor(authorId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`authors/${authorId}/approve`, {})
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async rejectAuthor(authorId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.post(`authors/${authorId}/reject`, {})
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async updateAuthorStatus(status: AuthorStatus, authorId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.patch(`authors/${authorId}`, {
          status: status,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
