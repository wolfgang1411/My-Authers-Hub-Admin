import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Comment, CreateComment, Pagination } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async createComment(comment: CreateComment): Promise<Comment> {
    try {
      return await this.loader.loadPromise(
        this.server.post<Comment>('comments', comment)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getFirstLevelComments(
    blogId: number,
    page: number = 1,
    itemsPerPage: number = 20
  ): Promise<Pagination<Comment>> {
    try {
      // Use admin endpoint to allow viewing comments on DRAFT blogs
      return await this.loader.loadPromise(
        this.server.get<Pagination<Comment>>(`comments/admin/blog/${blogId}`, {
          page,
          itemsPerPage,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getReplies(
    commentId: number,
    page: number = 1,
    itemsPerPage: number = 20
  ): Promise<Pagination<Comment>> {
    try {
      // Use admin endpoint to allow viewing replies on DRAFT blogs
      return await this.loader.loadPromise(
        this.server.get<Pagination<Comment>>(`comments/admin/comment/${commentId}/replies`, {
          page,
          itemsPerPage,
        })
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getCommentsByBlogAndParent(
    blogId: number,
    parentId: number | null,
    page: number = 1,
    itemsPerPage: number = 20
  ): Promise<Pagination<Comment>> {
    try {
      const parentIdParam = parentId === null ? 'null' : parentId.toString();
      return await this.loader.loadPromise(
        this.server.get<Pagination<Comment>>(
          `comments/blog/${blogId}/parent/${parentIdParam}`,
          {
            page,
            itemsPerPage,
          }
        )
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async deleteComment(id: number): Promise<void> {
    try {
      return await this.loader.loadPromise(
        this.server.delete<void>(`comments/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}

