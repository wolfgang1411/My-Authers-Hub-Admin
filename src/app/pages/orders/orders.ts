import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { OrderService } from '../../services/order';
import {
  DeliveryStatus,
  Order,
  OrderFilter,
  OrderStatus,
  StaticValues,
} from '../../interfaces';
import { Subject, debounceTime } from 'rxjs';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from '../../services/logger';
import Swal from 'sweetalert2';
import { exportToExcel } from '../../common/utils/excel';
import { format } from 'date-fns';
import { StaticValuesService } from 'src/app/services/static-values';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    SharedModule,
    ListTable,
    AngularSvgIconModule,
    RouterModule,
    MatIcon,
    MatButton,
    MatIconButton,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Orders implements OnInit {
  constructor(
    private orderService: OrderService,
    private translateService: TranslateService,
    private logger: Logger,
    private staticValuesService: StaticValuesService,
    private userService: UserService
  ) {}

  isSuperAdmin = computed(() => {
    return this.userService.loggedInUser$()?.accessLevel === 'SUPERADMIN';
  });

  pageTitle = computed(() => {
    return this.isSuperAdmin() ? 'orders' : 'myorders';
  });

  lastPage = signal(1);

  filter = signal<OrderFilter>({
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
    orderBy: 'id',
    orderByVal: 'desc',
    status: undefined,
    deliveryStatus: undefined,
  });

  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(400))
    .subscribe((value) => {
      this.filter.update((f) => ({ ...f, searchStr: value, page: 1 }));
      this.clearCache();
      this.updateOrderList();
    });

  orders = signal<Order[]>([]);

  private pageCache = new Map<number, Order[]>();
  private cachedFilterKey = '';

  displayedColumns = computed(() => {
    if (this.isSuperAdmin()) {
      return [
        'orderid',
        'name',
        'email',
        'amount',
        'deliverystatus',
        'actions',
      ];
    } else {
      return [
        'orderid',
        'orderdate',
        'totalamount',
        'delivery',
        'status',
        'numberoftitles',
        'actions',
      ];
    }
  });
  dataSource = new MatTableDataSource<any>();

  deliveryStatusTabs = computed(() => {
    const enums = this.staticValuesService.staticValues()?.DeliveryStatus || {};
    const dynamicTabs = Object.keys(enums).map((key) => ({
      label: key.toLowerCase(),
      value: key as DeliveryStatus,
    }));
    return [{ label: 'all', value: undefined }, ...dynamicTabs];
  });

  deliveryStatusMenuOptions = computed(() => {
    const enums = this.staticValuesService.staticValues()?.DeliveryStatus || {};
    return Object.keys(enums).map(
      (key) => enums[key as keyof typeof enums] as DeliveryStatus
    );
  });

  ngOnInit(): void {
    this.updateOrderList();
  }

  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      searchStr: currentFilter.searchStr,
      itemsPerPage: currentFilter.itemsPerPage,
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
      status: currentFilter.status,
      deliveryStatus: currentFilter.deliveryStatus,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  async updateOrderList() {
    const currentFilter = this.filter();
    const currentPage = currentFilter.page || 1;
    const filterKey = this.getFilterKey();

    if (this.cachedFilterKey !== filterKey) {
      this.clearCache();
      this.cachedFilterKey = filterKey;
    }

    if (this.pageCache.has(currentPage)) {
      const cachedOrders = this.pageCache.get(currentPage)!;
      this.orders.set(cachedOrders);
      this.mapOrdersToDataSource(cachedOrders);
      return;
    }

    const { deliveryStatus, status, ...rest } = currentFilter;
    const sanitizedFilter = {
      ...rest,
      ...(status ? { status } : {}),
      ...(deliveryStatus ? { deliveryStatus } : {}),
    };

    const orders = await this.orderService.fetchOrders(sanitizedFilter);
    this.pageCache.set(currentPage, orders.items);
    this.orders.set(orders.items);
    this.lastPage.set(Math.ceil(orders.totalCount / orders.itemsPerPage));
    this.mapOrdersToDataSource(orders.items);
  }

  private canChangeDeliveryStatus(status?: DeliveryStatus) {
    return true;
    // return status !== 'RETURNED' && status !== 'CANCELLED';
  }

  async changeDeliveryStatus(orderId: number, status: DeliveryStatus) {
    if (!this.canChangeDeliveryStatus(status)) return;
    try {
      await this.orderService.updateDeliveryStatus(orderId, status);
      // Optimistic UI update without refetch
      const updater = (list?: Order[]) =>
        (list || []).map((o) =>
          o.id === orderId ? { ...o, deliveryStatus: status } : o
        );

      this.orders.update((o) => updater(o));

      // Update cached pages
      const newCache = new Map(this.pageCache);
      newCache.forEach((page, key) => {
        newCache.set(key, updater(page));
      });
      this.pageCache = newCache;

      // Refresh table datasource from current orders signal
      this.mapOrdersToDataSource(this.orders());

      Swal.fire({
        icon: 'success',
        title:
          this.translateService.instant('statusupdated') || 'Status updated',
        text:
          this.translateService.instant('deliverystatus') +
          ' ' +
          (this.translateService.instant('updatedsuccessfully') ||
            'updated successfully'),
      });
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translateService.instant('somethingwentwrong') ||
          'Something went wrong',
      });
    }
  }

  private mapOrdersToDataSource(orders: Order[]) {
    if (this.isSuperAdmin()) {
      this.dataSource.data = orders.map((order, index) => {
        const booking = order.bookings?.[0];
        const user = booking?.user || booking?.userDetails || order.user;
        return {
          ...order,
          orderid: `#${order.id}`,
          serial: index + 1,
          name:
            user?.fullName ||
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '—',
          title: booking?.title?.name || '—',
          status: order.status,
          deliverystatus: order.deliveryStatus,
          amount: `${order.totalAmount} INR`,
        };
      });
    } else {
      this.dataSource.data = orders.map((order) => {
        const numberOfTitles = order.bookings?.length || 0;
        return {
          ...order,
          orderid: `#${order.id}`,
          orderdate: order.createdAt
            ? format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')
            : '—',
          totalamount: `₹${order.totalAmount.toFixed(2)}`,
          delivery: `₹${order.delivery?.toFixed(2) || '0.00'}`,
          status: order.status,
          numberoftitles: numberOfTitles,
        };
      });
    }
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.updateOrderList();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.updateOrderList();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.updateOrderList();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.updateOrderList();
  }

  onStatusChange(status?: OrderStatus) {
    this.filter.update((f) => ({ ...f, status, page: 1 }));
    this.clearCache();
    this.updateOrderList();
  }

  onDeliveryStatusChange(status?: DeliveryStatus) {
    this.filter.update((f) => ({ ...f, deliveryStatus: status, page: 1 }));
    this.clearCache();
    this.updateOrderList();
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

  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'fullName',
      email: 'email',
      title: 'titleName',
      amount: 'totalAmount',
      status: 'status',
      deliverystatus: 'deliveryStatus',
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
    this.updateOrderList();
  }

  async onExportToExcel(): Promise<void> {
    try {
      const orders = this.orders();
      if (!orders || orders.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning') || 'Warning',
          text:
            this.translateService.instant('nodatatoexport') ||
            'No data to export',
        });
        return;
      }

      const exportColumns = this.displayedColumns().filter(
        (col: string) => col !== 'actions'
      );

      const exportData = orders.map((order) => {
        const booking = order.bookings?.[0];
        const user = booking?.user || booking?.userDetails || order.user;
        const dataRow: Record<string, any> = {};

        exportColumns.forEach((col: string) => {
          switch (col) {
            case 'orderid':
              dataRow[col] = `#${order.id}`;
              break;
            case 'name':
              dataRow[col] =
                user?.fullName ||
                `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
              break;
            case 'email':
              dataRow[col] = user?.email || '-';
              break;
            case 'title':
              dataRow[col] = booking?.title?.name || '-';
              break;
            case 'amount':
              dataRow[col] = `${order.totalAmount} INR`;
              break;
            case 'deliverystatus':
              dataRow[col] = order.deliveryStatus || '-';
              break;
            default:
              dataRow[col] = (order as any)[col] || '-';
          }
        });

        return dataRow;
      });

      const headers: Record<string, string> = {
        id: this.translateService.instant('id') || 'ID',
        name: this.translateService.instant('name') || 'Name',
        email: this.translateService.instant('email') || 'Email',
        title: this.translateService.instant('title') || 'Title',
        amount: this.translateService.instant('amount') || 'Amount',
        deliverystatus:
          this.translateService.instant('deliverystatus') || 'Delivery Status',
      };

      const currentPage = this.filter().page || 1;
      const fileName = `orders-page-${currentPage}-${format(
        new Date(),
        'dd-MM-yyyy'
      )}`;

      exportToExcel(exportData, fileName, headers, 'Orders');

      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success') || 'Success',
        text:
          this.translateService.instant('exportsuccessful') ||
          'Data exported successfully',
      });
    } catch (error) {
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
