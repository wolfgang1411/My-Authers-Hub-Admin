import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Pagination } from '../../interfaces';
import { Author, AuthorFilter } from '../../interfaces/Authors';

@Injectable({
  providedIn: 'root'
})
export class AuthorsService {
   constructor(private server: Server) {}
  
    async getAuthors(filter?:AuthorFilter) {
      try {
        return await this.server.get<Pagination<Author>>('authors',filter);
      } catch (error) {
        console.error('Error fetching publishers:', error);
        throw error;
      }
    }
    async getAuthorrById(id: number) {
      try {
        return await this.server.get<Author>(`authors/${id}`);
      } catch (error) {
        console.error(`Error fetching publisher with id ${id}:`, error);
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
      throw error;
    }
  }
}
