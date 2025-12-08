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

  lastPage = signal(1);
  
  filter = signal<BookingFilter>({
    page: 1,
    itemsPerPage: 10,
    searchStr: '',
  });

  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(400))
    .subscribe((value) => {
      this.filter.update((f) => ({ ...f, searchStr: value, page: 1 }));
      this.clearCache();
      this.updateBookingList();
    });

  bookings = signal<Booking[]>([]);
  
  // Cache to store fetched pages
  private pageCache = new Map<number, Booking[]>();
  private cachedFilterKey = '';
  
  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      searchStr: currentFilter.searchStr,
      itemsPerPage: currentFilter.itemsPerPage,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

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
    const currentFilter = this.filter();
    const currentPage = currentFilter.page || 1;
    const filterKey = this.getFilterKey();
    
    // Clear cache if filter changed
    if (this.cachedFilterKey !== filterKey) {
      this.clearCache();
      this.cachedFilterKey = filterKey;
    }

    // Check if page is already cached
    if (this.pageCache.has(currentPage)) {
      const cachedBookings = this.pageCache.get(currentPage)!;
      this.bookings.set(cachedBookings);
      this.mapBookingsToDataSource(cachedBookings);
      return;
    }

    // Fetch from API
    const bookings = await this.bookingService.fetchBookings(currentFilter);
    
    // Cache the fetched page
    this.pageCache.set(currentPage, bookings.items);
    this.bookings.set(bookings.items);
    this.lastPage.set(Math.ceil(bookings.totalCount / bookings.itemsPerPage));
    this.mapBookingsToDataSource(bookings.items);
  }
  
  private mapBookingsToDataSource(bookings: Booking[]) {
    this.dataSource.data = bookings.map((booking, index) => {
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

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.updateBookingList();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.updateBookingList();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.updateBookingList();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.updateBookingList();
  }

  getPageNumbers(): number[] {
    const currentPage = this.filter().page || 1;
    const totalPages = this.lastPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      }
    }

    return pages;
  }
}
