import { Injectable, signal } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { StaticValues } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class StaticValuesService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  staticValues = signal<typeof StaticValues | null>(null);

  async fetchAndUpdateStaticValues() {
    try {
      const response = await this.loader.loadPromise(
        this.server.get<typeof StaticValues>('enums')
      );
      this.staticValues.set(response);
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
