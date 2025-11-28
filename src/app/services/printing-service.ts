import { Injectable } from '@angular/core';
import { Server } from './server';
import {
  BasicFilter,
  BookBindings,
  LaminationType,
  Pagination,
  PaperQuailty,
  Size,
  SizeCategory,
  TitlePrintingCostPayload,
  TitlePrintingCostResponse,
} from '../interfaces';
import { Logger } from './logger';

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
  async getSizeById(sizeId: number) {
    try {
      return await this.serverService.get<SizeCategory>(`size/${sizeId}`);
    } catch (error) {
      console.error('Error fetching size by id:', error);
      throw error;
    }
  }
  async getBindingTypesBySizeCategoryId(sizeCategoryId: number) {
    try {
      return await this.serverService.get<BookBindings[]>(
        `size-category/${sizeCategoryId}/binding-types`
      );
    } catch (error) {
      console.error('Error fetching binding types by size category:', error);
      throw error;
    }
  }
  async getLaminationTypesBySizeCategoryId(sizeCategoryId: number) {
    try {
      return await this.serverService.get<LaminationType[]>(
        `size-category/${sizeCategoryId}/lamination-types`
      );
    } catch (error) {
      console.error('Error fetching lamination types by size category:', error);
      throw error;
    }
  }
  async getPaperQualitiesBySizeCategoryId(sizeCategoryId: number) {
    try {
      return await this.serverService.get<PaperQuailty[]>(
        `size-category/${sizeCategoryId}/paper-qualities`
      );
    } catch (error) {
      console.error('Error fetching paper qualities by size category:', error);
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

  async getSizesByCategoryId(sizeCategoryId: number) {
    try {
      return await this.serverService.get<Pagination<Size>>('size', {
        sizeCategoryId,
        itemsPerPage: 200,
      });
    } catch (error) {
      console.error('Error fetching sizes by category:', error);
      throw error;
    }
  }
}
