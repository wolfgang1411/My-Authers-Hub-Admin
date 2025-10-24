import { Component, signal } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { BookingService } from '../../services/booking';
import { Booking, BookingFilter, BookingStatus } from '../../interfaces';

@Component({
  selector: 'app-recent-orders-component',
  imports: [CurrencyPipe, CommonModule],
  templateUrl: './recent-orders-component.html',
  styleUrl: './recent-orders-component.css',
})
export class RecentOrdersComponent {
  constructor(private bookingService: BookingService) {}
  ngOnInit() {
    this.fetchAndUpdateOrders();
  }

  bookings = signal<Booking[] | null>(null);
  filter: BookingFilter = {
    itemsPerPage: 10,
    status: BookingStatus.COMPLETED,
  };

  async fetchAndUpdateOrders() {
    const { items } = await this.bookingService.fetchBookings(this.filter);
    this.bookings.update((bookings) =>
      bookings && bookings.length && (this.filter.page || 0) > 1
        ? [...bookings, ...items]
        : items
    );
  }
}
