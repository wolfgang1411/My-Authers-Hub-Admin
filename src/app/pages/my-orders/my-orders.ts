import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { OrderService } from '../../services/order';
import {
  Order,
  OrderFilter,
  OrderStatus,
  StaticValues,
} from '../../interfaces';
import { Subject, debounceTime } from 'rxjs';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from '../../services/logger';
import { format } from 'date-fns';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [
    SharedModule,
    ListTable,
    RouterModule,
    MatIcon,
    MatButton,
    MatIconButton,
  ],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrders implements OnInit {
  constructor(
    private orderService: OrderService,
    private translateService: TranslateService,
    private logger: Logger
  ) {}

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

  displayedColumns: string[] = [
    'orderid',
    'orderdate',
    'totalamount',
    'delivery',
    'status',
    'numberoftitles',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>();

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

    try {
      const orders = await this.orderService.fetchOrders(sanitizedFilter);
      this.pageCache.set(currentPage, orders.items);
      this.orders.set(orders.items);
      this.lastPage.set(Math.ceil(orders.totalCount / orders.itemsPerPage));
      this.mapOrdersToDataSource(orders.items);
    } catch (error) {
      this.logger.logError(error);
    }
  }

  private mapOrdersToDataSource(orders: Order[]) {
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

