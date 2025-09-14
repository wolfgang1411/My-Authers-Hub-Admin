import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { BookingService } from '../../services/booking';
import { ActivatedRoute } from '@angular/router';
import { Booking } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatList, MatListItem } from '@angular/material/list';
import { MyDatePipe } from '../../pipes/my-date-pipe';
import { TransactionTable } from '../../components/transaction-table/transaction-table';

@Component({
  selector: 'app-booking-details',
  imports: [SharedModule, MatList, MatListItem, MyDatePipe, TransactionTable],
  templateUrl: './booking-details.html',
  styleUrl: './booking-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetails implements OnInit {
  constructor(private bookingService: BookingService, route: ActivatedRoute) {
    route.params.subscribe(({ id }) => {
      this.bookingId = Number(id);
    });
  }

  bookingId!: number;
  booking = signal<Booking | null>(null);

  async ngOnInit() {
    const response = await this.bookingService.fetchBooking(this.bookingId);
    this.booking.set({
      ...response,
      transactions: response.transactions.map((txn) => ({
        ...txn,
        user: response.user || response.userDetails,
        booking: response,
      })),
    });
  }
}
