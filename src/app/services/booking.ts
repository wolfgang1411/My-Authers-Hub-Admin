import { Injectable } from '@angular/core';
import { Server } from './server';
import { Booking, BookingFilter, Pagination } from '../interfaces';
import { Logger } from './logger';
import { LoaderService } from './loader';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  constructor(
    private serverService: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}

  async fetchBookings(filter: BookingFilter) {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<Pagination<Booking>>('bookings', filter),
        'bookings'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchBooking(id: number | string) {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<Booking>(`bookings/${id}`),
        'booking'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
