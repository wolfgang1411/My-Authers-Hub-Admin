import { inject, Injectable, signal } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import {
  Platform,
  PlatformFilter,
  PlatformStatus,
} from '../interfaces/Platform';

export interface PlatformPayload {
  name: string;
  marginPercent: number;
  extraFlatMargin?: number;
  isEbookPlatform?: boolean;
  isSuperAdminPricingOnly?: boolean;
  isInventoryPlatform?: boolean;
  status?: PlatformStatus;
}

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
  async fetchPlatforms(filter?: PlatformFilter): Promise<Platform[]> {
    try {
      // Build query params - include inventory platforms if needed
      const queryParams: PlatformFilter & { includeInventory?: boolean } = {
        ...filter,
      };
      
      // If explicitly requesting inventory platforms, also include regular platforms
      if (filter?.isInventoryPlatform) {
        queryParams.includeInventory = true;
      }
      
      // Use a specific loader key to make the network call visible
      const platforms = await this.loaderService.loadPromise(
        this.serverService.get<Platform[]>('platforms', queryParams),
        'fetch-platforms'
      );
      this.platforms.set(this.sortPlatforms(platforms));
      return platforms;
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async createPlatform(payload: PlatformPayload): Promise<Platform> {
    try {
      const response = await this.loaderService.loadPromise(
        this.serverService.post<Platform>('platforms', {
          status: PlatformStatus.ACTIVE,
          ...payload,
        }),
        'create-platform'
      );
      this.upsertPlatform(response);
      return response;
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async updatePlatform(
    id: number,
    payload: PlatformPayload
  ): Promise<Platform> {
    try {
      const response = await this.loaderService.loadPromise(
        this.serverService.patch<Platform>(`platforms/${id}`, payload),
        'update-platform'
      );
      this.upsertPlatform(response);
      return response;
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
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
   * Get platform by ID
   */
  getPlatformById(id: number): Platform | undefined {
    return this.platforms().find((p) => p.id === id);
  }

  /**
   * Get platform names as array (for backward compatibility with PlatForm enum)
   */
  getPlatformNames(): string[] {
    return this.platforms().map((p) => p.name);
  }

  private upsertPlatform(platform: Platform) {
    this.platforms.update((items) =>
      this.sortPlatforms([
        ...items.filter((p) => p.id !== platform.id),
        platform,
      ])
    );
  }

  private sortPlatforms(platforms: Platform[]) {
    return [...platforms].sort((a, b) => a.name.localeCompare(b.name));
  }
}
