import { Injectable } from '@angular/core';
import { Server } from '../../services/server';
import { Pagination } from '../../interfaces';
import {
  Title,
  TitleCategory,
  TitleFilter,
  TitleGenre,
} from '../../interfaces/Titles';

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  constructor(private server: Server) {}

  async getTitles(filter?: TitleFilter) {
    try {
      return await this.server.get<Pagination<Title>>('titles', filter);
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
  async getTitleCategory() {
    try {
      return await this.server.get<Pagination<TitleCategory>>('category');
    } catch (error) {
      console.error('Error fetching:', error);
      throw error;
    }
  }
  async getGenre() {
    try {
      return await this.server.get<Pagination<TitleGenre>>('genre');
    } catch (error) {
      console.error('Error fetching:', error);
      throw error;
    }
  }
  async getSubcategory(categoryId: number) {
    try {
      return await this.server.get<Pagination<TitleCategory>>('category', {
        parentId: categoryId,
      });
    } catch (error) {
      console.error('Error fetching:', error);
      throw error;
    }
  }
  async getTradeCategory() {
    try {
      return await this.server.get<Pagination<TitleCategory>>('category', {
        type: 'TRADE',
      });
    } catch (error) {
      throw error;
    }
  }
}
