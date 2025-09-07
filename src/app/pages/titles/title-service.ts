import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Pagination } from '../../interfaces';
import { Title, TitleFilter } from '../../interfaces/Titles';

@Injectable({
  providedIn: 'root'
})
export class TitleService {
     constructor(private server: Server) {}
    
      async getTitles(filter?:TitleFilter) {
        try {
          return await this.server.get<Pagination<Title>>('titles',filter);
        } catch (error) {
          console.error('Error fetching publishers:', error);
          throw error;
        }
      }
        // Initialization logic can gp here if needed
      async getTitleById(id: number) {
        try {
          return await this.server.get<Title>(`titles/${id}`);
        } catch (error) {
          console.error(`Error fetching title with id ${id}:`, error);
          throw error;
        }           
    }
}
