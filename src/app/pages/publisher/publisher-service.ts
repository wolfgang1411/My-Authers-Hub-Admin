import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Publishers } from '../../interfaces/Publishers';
import { Pagination } from '../../interfaces';

@Injectable({
  providedIn: 'root'
})
export class PublisherService {
  constructor(private server: Server) {}

  async getPublishers() {
    try {
      return await this.server.get<Pagination<Publishers>>('publishers');
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }
    // Initialization logic can gp here if needed
  async getPublisherById(id: number) {
    try {
      return await this.server.get<Publishers>(`publishers/${id}`);
    } catch (error) {
      console.error(`Error fetching publisher with id ${id}:`, error);
      throw error;
    }           
}
}