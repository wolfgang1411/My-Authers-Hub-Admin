import { Injectable } from '@angular/core';
import { Server } from './server';
import { LoaderService } from './loader';
import { Logger } from './logger';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  constructor(
    private serverService: Server,
    private loaderService: LoaderService,
    private loggerService: Logger
  ) {}
  async getDownloadInvoice(bookingId: number): Promise<string> {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.getDocument(`invoice/temp`)
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }
}
