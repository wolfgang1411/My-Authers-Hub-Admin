import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { AuthorMediaType, Media, Pagination } from '../../interfaces';
import { Author, AuthorFilter, AuthorStatus } from '../../interfaces';
import { Logger } from '../../services/logger';
import { LoaderService } from '../../services/loader';
import { S3Service } from 'src/app/services/s3';

@Injectable({
  providedIn: 'root',
})
export class AuthorsService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService,
    private s3upload: S3Service
  ) {}

  async sendInviteLink(email: string) {
    try {
      return await this.loader.loadPromise(
        this.server.post<{ message: string; success: boolean }>(
          'authors/invite',
          {
            email,
          }
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getAuthorsCount(filter: AuthorFilter, showLoader = true) {
    try {
      filter = { ...filter };
      if (!filter.status || filter.status.toLocaleString() === ('all' as any)) {
        delete filter.status;
      }
      return await this.loader.loadPromise(
        this.server.get<{ count: number }>('authors/count', filter),
        'fetch-authors',
        !showLoader
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getAuthors(filter?: AuthorFilter, showLoader = true) {
    try {
      filter = { ...filter };
      if (!filter.status || filter.status.toLocaleString() === ('all' as any)) {
        delete filter.status;
      }
      return await this.loader.loadPromise(
        this.server.get<Pagination<Author>>('authors', filter),
        'fetch-authors',
        !showLoader
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
  async updateAuthorStatus(
    { status, delinkTitle }: { status: AuthorStatus; delinkTitle?: number },
    authorId: number
  ) {
    try {
      return await this.loader.loadPromise(
        this.server.patch(`authors/${authorId}/status`, {
          status: status,
          delinkTitle,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  uploadAuthorImage(
    file: File,
    authorId: number
  ): Promise<{ id: number; url: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const { name } = await this.s3upload.uploadMedia(file);
        const media = await this.server.post<Media>(
          `author-media/${authorId}/medias`,
          {
            keyname: name,
            mime: file.type,
            type: AuthorMediaType.IMAGE,
          }
        );
        resolve(media);
      } catch (error) {
        this.logger.logError(error);
        reject(error);
      }
    });
  }
  async updateMyImage(file: File, authorId: number) {
    try {
      const media = await this.uploadAuthorImage(file, authorId);
      return media;
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
  async removeImage(mediaId: number) {
    try {
      return await this.loader.loadPromise(
        this.server.delete(`author-media/medias/${mediaId}`)
      );
    } catch (error) {
      throw error;
      this.logger.logError(error);
    }
  }
}
