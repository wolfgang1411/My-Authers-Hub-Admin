import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BookingService } from '../../services/booking';
import { Booking, BookingFilter } from '../../interfaces';
import { signal } from '@angular/core';
import { ListTable } from '../../components/list-table/list-table';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { SharedModule } from '../../modules/shared/shared-module';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { BehaviorSubject, debounceTime, Subject } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatButton, MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-bookings',
  imports: [
    SharedModule,
    ListTable,
    AngularSvgIconModule,
    RouterModule,
    MatIcon,
    MatButton,
    MatIconButton,
  ],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bookings implements OnInit {
  constructor(private bookingService: BookingService) {}

  filter: BookingFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
  };

  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(400))
    .subscribe((value) => {
      this.filter.searchStr = value;
      this.filter.page = 1;
      this.updateBookingList();
    });

  lastPage = signal(1);
  bookings = signal<Booking[]>([]);

  displayedColumns: string[] = [
    'name',
    'email',
    'title',
    'amount',
    'status',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>();

  ngOnInit(): void {
    this.updateBookingList();
  }

  async updateBookingList() {
    const bookings = await this.bookingService.fetchBookings(this.filter);
    this.bookings.set(bookings.items);
    this.lastPage.set(Math.ceil(bookings.totalCount / bookings.itemsPerPage));
    this.dataSource.data = bookings.items.map((booking, index) => {
      return {
        id: booking.id,
        titleId: booking.title.id,
        userId: booking.userDetails.id,
        serial: index + 1,
        name:
          booking.userDetails.firstName +
          ' ' +
          (booking.userDetails.lastName || 'N/A'),
        email: booking.userDetails.email,
        title: booking.title.name,
        status: booking.status,
        amount: `${booking.totalAmount} INR`,
      };
    });
  }
}
