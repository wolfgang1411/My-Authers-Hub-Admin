import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Pagination } from '../../interfaces';
import { Author, AuthorFilter } from '../../interfaces/Authors';
import { Logger } from '../../services/logger';

@Injectable({
  providedIn: 'root',
})
export class AuthorsService {
  constructor(private server: Server, private logger: Logger) {}

  async getAuthors(filter?: AuthorFilter) {
    try {
      return await this.server.get<Pagination<Author>>('authors', filter);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async getAuthorrById(id: number) {
    try {
      return await this.server.get<Author>(`authors/${id}`);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createAuthor(authorData: Author): Promise<Author> {
    try {
      return await this.server[authorData.id ? 'patch' : 'post'](
        authorData.id ? `authors/${authorData.id}` : 'authors',
        { ...authorData }
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
