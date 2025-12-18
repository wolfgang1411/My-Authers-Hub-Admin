import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Observable, of } from 'rxjs';
import { Stat } from '../interfaces/Stats';
import {
  DashbordStateType,
  Pagination,
  StatsMonthly,
  StatsResponseMap,
  StatsWeekly,
  StatsYearly,
  Title,
  TitleFilter,
} from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(
    private server: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  // default: last 30 days
  private timeWindowDays = 30;

  setTimeWindow(days: number) {
    this.timeWindowDays = days;
  }

  getTimeWindow() {
    return this.timeWindowDays;
  }

  async getStatsTemp<T extends keyof StatsResponseMap>(
    type: T
  ): Promise<StatsResponseMap[T][]> {
    try {
      return await this.loader.loadPromise(
        this.server.get(`sales/count/duration/${type}`),
        'fetch-stats'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getRecentTitles(titleFilter: TitleFilter): Promise<Pagination<Title>> {
    try {
      return await this.loader.loadPromise(
        this.server.get('titles', titleFilter)
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  getNotifications() {
    return of({
      pendingISBN: 5,
      pendingTitleApproval: 2,
      pendingPayouts: 3,
    });
  }
}
