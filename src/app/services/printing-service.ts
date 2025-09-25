import { Injectable } from '@angular/core';
import { Server } from './server';
import {
  BasicFilter,
  BookBindings,
  LaminationType,
  Pagination,
  PaperQuailty,
  SizeCategory,
  TitlePrintingCostPayload,
  TitlePrintingCostResponse,
} from '../interfaces';
import { TitlePrinting } from '../components/title-printing/title-printing';
import { Logger } from './logger';
import path from 'path';

@Injectable({
  providedIn: 'root',
})
export class PrintingService {
  constructor(private serverService: Server, private logger: Logger) {}
  async getBindingType(filter?: BasicFilter) {
    try {
      return await this.serverService.get<Pagination<BookBindings>>(
        'book-bindings',
        filter
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }
  async getLaminationType(filter?: BasicFilter) {
    try {
      return await this.serverService.get<Pagination<LaminationType>>(
        'lamination',
        filter
      );
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }
  async getAllPaperTypes(filter?: BasicFilter) {
    try {
      return await this.serverService.get<Pagination<PaperQuailty>>(
        'paper-quality',
        filter
      );
    } catch (error) {
      console.error('Error fetching paper types:', error);
      throw error;
    }
  }
  async getSizeCategory(filter?: BasicFilter) {
    try {
      return await this.serverService.get<Pagination<SizeCategory>>(
        `size`,
        filter
      );
    } catch (error) {
      console.error('Error fetching paper types by category:', error);
      throw error;
    }
  }
  async getPrintingPrice(
    printingGroup: TitlePrintingCostPayload
  ): Promise<TitlePrintingCostResponse> {
    try {
      const response = await this.serverService.post<TitlePrintingCostResponse>(
        'title-printing/price',
        printingGroup
      );
      return response;
    } catch (error) {
      console.error('Error fetching printing price:', error);
      this.logger.logError(error);
      throw error;
    }
  }
}
