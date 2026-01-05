import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Blog, BlogFilter, CreateBlog, UpdateBlog, Pagination } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async fetchBlogs(filter: BlogFilter): Promise<Pagination<Blog>> {
    try {
      return await this.loader.loadPromise(
        this.server.get<Pagination<Blog>>('blogs', filter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchBlog(id: number): Promise<Blog> {
    try {
      return await this.loader.loadPromise(
        this.server.get<Blog>(`blogs/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async createBlog(blog: CreateBlog): Promise<Blog> {
    try {
      return await this.loader.loadPromise(
        this.server.post<Blog>('blogs', blog)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async updateBlog(blog: UpdateBlog): Promise<Blog> {
    try {
      return await this.loader.loadPromise(
        this.server.patch<Blog>(`blogs/${blog.id}`, blog)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async deleteBlog(id: number): Promise<void> {
    try {
      return await this.loader.loadPromise(
        this.server.delete<void>(`blogs/${id}`)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}


