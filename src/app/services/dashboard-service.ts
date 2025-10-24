import { Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Observable, of } from 'rxjs';
import { Stat } from '../interfaces/Stats';
import {
  DashbordStateType,
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

  getStats(): Observable<Stat[]> {
    const stats: Stat[] = [
      {
        title: 'Total Titles',
        value: '44,278',
        subtitle: '5% Last week',
        color: 'cyan',
      },
      {
        title: 'Total Authors',
        value: '67,987',
        subtitle: '0.75% Last 6 days',
        color: 'pink',
      },
      {
        title: 'Total Copies Sold',
        value: '$76,965',
        subtitle: '0.9% Last 9 days',
        color: 'green',
      },
      {
        title: 'Total Royalty',
        value: '$59,765',
        subtitle: '0.6% Last year',
        color: 'orange',
      },
      {
        title: 'Total Earnings',
        value: '$59,765',
        subtitle: '0.6% Last year',
        color: 'orange',
      },
    ];
    return of(stats);
  }

  getSalesSeries() {
    // mock monthly data
    return of({
      labels: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      sales: [120, 300, 200, 450, 400, 700, 500, 600, 750, 420, 350, 250],
      orders: [200, 500, 150, 300, 420, 520, 495, 630, 550, 480, 390, 300],
    });
  }

  getRecentOrders() {
    const orders = [
      {
        id: 'MAH-1001',
        title: 'The Angular Way',
        buyer: 'A. Kumar',
        status: 'Delivered',
        amount: 12.99,
        date: '2025-09-25',
      },
      {
        id: 'MAH-1002',
        title: 'Tailwind Mastery',
        buyer: 'S. Gupta',
        status: 'Cancelled',
        amount: 9.99,
        date: '2025-09-23',
      },
      {
        id: 'MAH-1003',
        title: 'JS Secrets',
        buyer: 'R. Sharma',
        status: 'Delivered',
        amount: 15.75,
        date: '2025-09-21',
      },
    ];
    return of(orders);
  }

  getBestSelling() {
    return of([
      { rank: 1, title: 'The Angular Way', royalties: 1234.5, copies: 1200 },
      { rank: 2, title: 'JS Secrets', royalties: 987.7, copies: 950 },
      { rank: 3, title: 'Tailwind Mastery', royalties: 765.2, copies: 800 },
    ]);
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

  getBrowserUsage() {
    return of([
      { name: 'Chrome', value: 35502, diff: +12.75 },
      { name: 'Opera', value: 12563, diff: -15.12 },
      { name: 'IE', value: 25364, diff: +24.37 },
    ]);
  }

  getNotifications() {
    return of({
      pendingISBN: 5,
      pendingTitleApproval: 2,
      pendingPayouts: 3,
    });
  }
}
