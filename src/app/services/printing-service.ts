import { Injectable } from '@angular/core';
import { Server } from './server';
import {
  BookBindings,
  LaminationType,
  Pagination,
  PaperQuailty,
  SizeCategory,
  TitlePrintingPayload,
} from '../interfaces';
import { TitlePrinting } from '../components/title-printing/title-printing';
import { Logger } from './logger';
import path from 'path';

@Injectable({
  providedIn: 'root',
})
export class PrintingService {
  constructor(private serverService: Server, private logger: Logger) {}
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
  async getAllPaperTypes() {
    try {
      return await this.serverService.get<Pagination<PaperQuailty>>(
        'paper-quality'
      );
    } catch (error) {
      console.error('Error fetching paper types:', error);
      throw error;
    }
  }
  async getSizeCategory() {
    try {
      return await this.serverService.get<Pagination<SizeCategory>>(`size`);
    } catch (error) {
      console.error('Error fetching paper types by category:', error);
      throw error;
    }
  }
  async getPrintingPrice(printingGroup: TitlePrintingPayload) {
    try {
      const response = await this.serverService.post<{ amount: number }>(
        'title-printing/price',
        printingGroup
      );
      return response.amount;
    } catch (error) {
      console.error('Error fetching printing price:', error);
      this.logger.logError(error);
      throw error;
    }
  }
}
