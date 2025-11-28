import { inject, Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import {
  BookBindings,
  CreateSize,
  CreateSizeCategory,
  LaminationType,
  PaperQuailty,
  Size,
  SizeCategory,
  TitlePrintingCostPayload,
  TitlePrintingCostResponse,
  UpdateBindingType,
  UpdateLaminationType,
  UpdatePaperQualityType,
  UpdateSize,
  UpdateSizeCategory,
  UpdateSizeType,
} from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  serverService = inject(Server);
  loggerService = inject(Logger);
  loaderService = inject(LoaderService);

  async fetchPrintingCost(data: TitlePrintingCostPayload) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.post<TitlePrintingCostResponse>(
          'title-printing/price',
          data
        )
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async createOrUpdateSizeType(data: UpdateSizeType) {
    try {
      data = { ...data };
      const url = data.id ? `size-category/${data.id}` : 'size-category';
      const method = data.id ? 'patch' : 'post';
      delete data.id;
      return await this.loaderService.loadPromise<SizeCategory>(
        this.serverService[method](url, data),
        'update-size-type'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async updateMarginPercent(percent: string | number) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.patch('keyvals', {
          key: 'PRINT_MARGIN_PERCENT',
          val: percent.toString(),
          isEncrypted: false,
        })
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async fetchMarginPercent() {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.get<{ val: string }>('keyvals/PRINT_MARGIN_PERCENT')
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  // Size Category methods
  async createSizeCategory(data: CreateSizeCategory) {
    try {
      return await this.loaderService.loadPromise<SizeCategory>(
        this.serverService.post('size-category', data),
        'create-size-category'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async updateSizeCategory(id: number, data: UpdateSizeCategory) {
    try {
      const { id: _, ...updateData } = data;
      return await this.loaderService.loadPromise<SizeCategory>(
        this.serverService.patch(`size-category/${id}`, updateData),
        'update-size-category'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async deleteSizeCategory(id: number) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.delete(`size-category/${id}`),
        'delete-size-category'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async getSizeCategories(filter?: { itemsPerPage?: number; page?: number }) {
    try {
      return await this.loaderService.loadPromise<{
        items: SizeCategory[];
        totalCount: number;
        itemsPerPage: number;
        page: number;
      }>(this.serverService.get('size-category', filter), 'fetch-size-categories');
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  // Size methods
  async createSize(data: CreateSize) {
    try {
      return await this.loaderService.loadPromise<Size>(
        this.serverService.post('size', data),
        'create-size'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async updateSize(id: number, data: UpdateSize) {
    try {
      const { id: _, ...updateData } = data;
      return await this.loaderService.loadPromise<Size>(
        this.serverService.patch(`size/${id}`, updateData),
        'update-size'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async deleteSize(id: number) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.delete(`size/${id}`),
        'delete-size'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  // Methods with sizeCategoryId support
  async createOrUpdateBindingType(data: UpdateBindingType & { sizeCategoryId?: number }) {
    try {
      data = { ...data };
      const url = data.id ? `book-bindings/${data.id}` : 'book-bindings';
      const method = data.id ? 'patch' : 'post';
      const id = data.id;
      delete data.id;
      return await this.loaderService.loadPromise<BookBindings>(
        this.serverService[method](url, data),
        'update-binding-type'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async createOrUpdateLaminationType(data: UpdateLaminationType & { sizeCategoryId?: number }) {
    try {
      data = { ...data };
      const url = data.id ? `lamination/${data.id}` : 'lamination';
      const method = data.id ? 'patch' : 'post';
      delete data.id;
      return await this.loaderService.loadPromise<LaminationType>(
        this.serverService[method](url, data),
        'update-lamination-type'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async createOrPaperQualityType(data: UpdatePaperQualityType & { sizeCategoryId?: number }) {
    try {
      data = { ...data };
      const url = data.id ? `paper-quality/${data.id}` : 'paper-quality';
      const method = data.id ? 'patch' : 'post';
      delete data.id;
      return await this.loaderService.loadPromise<PaperQuailty>(
        this.serverService[method](url, data),
        'update-paper-quality'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }
}
