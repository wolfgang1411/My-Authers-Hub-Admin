import { inject, Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  SizeCategory,
  TitlePrintingCostPayload,
  TitlePrintingCostResponse,
  UpdateBindingType,
  UpdateLaminationType,
  UpdatePaperQualityType,
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

  async createOrUpdateBindingType(data: UpdateBindingType) {
    try {
      data = { ...data };
      const url = data.id ? `book-bindings/${data.id}` : 'book-bindings';
      const method = data.id ? 'patch' : 'post';
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

  async createOrUpdateLaminationType(data: UpdateLaminationType) {
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

  async createOrPaperQualityType(data: UpdatePaperQualityType) {
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
}
