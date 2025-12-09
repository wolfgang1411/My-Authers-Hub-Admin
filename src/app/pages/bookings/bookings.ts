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
import { exportToExcel } from '../../common/utils/excel';
import { TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { Logger } from '../../services/logger';
import Swal from 'sweetalert2';

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
  constructor(
    private bookingService: BookingService,
    private translateService: TranslateService,
    private logger: Logger
  ) {}

  lastPage = signal(1);

  filter = signal<BookingFilter>({
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
    orderBy: 'id',
    orderByVal: 'desc',
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
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
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
        name: booking.user.fullName,
        email: booking.user.email,
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

  // Map display columns to API sort fields
  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'fullName',
      email: 'email',
      title: 'titleName',
      amount: 'totalAmount',
      status: 'status',
      // Direct fields that can be sorted
      id: 'id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    return columnMap[column] || null;
  };

  isSortable = (column: string): boolean => {
    return this.getApiFieldName(column) !== null;
  };

  onSortChange(sort: { active: string; direction: 'asc' | 'desc' | '' }) {
    const apiFieldName = this.getApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.filter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.clearCache();
    this.updateBookingList();
  }

  async onExportToExcel(): Promise<void> {
    try {
      const bookings = this.bookings();
      if (!bookings || bookings.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning') || 'Warning',
          text:
            this.translateService.instant('nodatatoexport') ||
            'No data to export',
        });
        return;
      }

      const exportColumns = this.displayedColumns.filter(
        (col) => col !== 'actions'
      );

      const exportData = bookings.map((booking) => {
        const dataRow: Record<string, any> = {};

        exportColumns.forEach((col) => {
          switch (col) {
            case 'name':
              dataRow[col] =
                booking.userDetails.firstName +
                ' ' +
                (booking.userDetails.lastName || '');
              break;
            case 'email':
              dataRow[col] = booking.userDetails.email || '-';
              break;
            case 'title':
              dataRow[col] = booking.title.name || '-';
              break;
            case 'amount':
              dataRow[col] = `${booking.totalAmount} INR`;
              break;
            case 'status':
              dataRow[col] = booking.status || '-';
              break;
            default:
              dataRow[col] = (booking as any)[col] || '-';
          }
        });

        return dataRow;
      });

      const headers: Record<string, string> = {
        name: this.translateService.instant('name') || 'Name',
        email: this.translateService.instant('email') || 'Email',
        title: this.translateService.instant('title') || 'Title',
        amount: this.translateService.instant('amount') || 'Amount',
        status: this.translateService.instant('status') || 'Status',
      };

      const currentPage = this.filter().page || 1;
      const fileName = `bookings-page-${currentPage}-${format(
        new Date(),
        'dd-MM-yyyy'
      )}`;

      exportToExcel(exportData, fileName, headers, 'Bookings');

      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success') || 'Success',
        text:
          this.translateService.instant('exportsuccessful') ||
          'Data exported successfully',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          this.translateService.instant('errorexporting') ||
          'Failed to export data. Please try again.',
      });
    }
  }
}
