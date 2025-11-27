import { inject, Injectable, signal } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Platform } from '../interfaces/Platform';
import { BookingType } from '../interfaces/StaticValue';

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private serverService = inject(Server);
  private loggerService = inject(Logger);
  private loaderService = inject(LoaderService);

  platforms = signal<Platform[]>([]);

  /**
   * Fetch all active platforms from the API
   */
  async fetchPlatforms(): Promise<Platform[]> {
    try {
      // Use a specific loader key to make the network call visible
      const platforms = await this.loaderService.loadPromise(
        this.serverService.get<Platform[]>('platforms'),
        'fetch-platforms'
      );
      this.platforms.set(platforms);
      return platforms;
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  /**
   * Get platforms filtered by type (EBOOK or PRINT)
   */
  getPlatformsByType(type: BookingType): Platform[] {
    return this.platforms().filter((p) => p.type === type);
  }

  /**
   * Get ebook platforms
   */
  getEbookPlatforms(): Platform[] {
    return this.platforms().filter((p) => p.isEbookPlatform);
  }

  /**
   * Get print platforms
   */
  getPrintPlatforms(): Platform[] {
    return this.platforms().filter((p) => !p.isEbookPlatform);
  }

  /**
   * Get platform by name
   */
  getPlatformByName(name: string): Platform | undefined {
    return this.platforms().find((p) => p.name === name);
  }

  /**
   * Get platform names as array (for backward compatibility with PlatForm enum)
   */
  getPlatformNames(): string[] {
    return this.platforms().map((p) => p.name);
  }
}


