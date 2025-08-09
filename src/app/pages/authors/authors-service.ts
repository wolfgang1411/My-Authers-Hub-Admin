import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Pagination } from '../../interfaces';
import { Author } from '../../interfaces/Authors';

@Injectable({
  providedIn: 'root'
})
export class AuthorsService {
   constructor(private server: Server) {}
  
    async getAuthors() {
      try {
        return await this.server.get<Pagination<Author>>('authors');
      } catch (error) {
        console.error('Error fetching publishers:', error);
        throw error;
      }
    }
      // Initialization logic can gp here if needed
    async getPublisherById(id: number) {
      try {
        return await this.server.get<Author>(`authors/${id}`);
      } catch (error) {
        console.error(`Error fetching publisher with id ${id}:`, error);
        throw error;
      }           
  }
}
