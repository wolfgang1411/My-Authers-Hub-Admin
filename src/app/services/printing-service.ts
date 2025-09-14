import { Injectable } from '@angular/core';
import { Server } from './server';
import { BookBindings, LaminationType, Pagination } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class PrintingService {
  constructor(private serverService: Server) {}
  async getBindingType() {
    try {
      return await this.serverService.get<Pagination<BookBindings>>(
        'book-bindings'
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }
  async getLaminationType() {
    try {
      return await this.serverService.get<Pagination<LaminationType>>(
        'lamination'
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }
}
