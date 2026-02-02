import { Component, OnInit, signal } from '@angular/core';
import { TransactionService } from '../../services/transaction';
import {
  Transaction,
  TransactionFilter,
  TransactionStatus,
} from '../../interfaces';
import { TransactionTable } from '../../components/transaction-table/transaction-table';
import { SharedModule } from '../../modules/shared/shared-module';
import { debounceTime, Subject } from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateService } from '@ngx-translate/core';
import { exportToExcel } from '../../common/utils/excel';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { Logger } from '../../services/logger';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-transactions',
  imports: [TransactionTable, SharedModule, MatButton, MatIconModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css',
})
export class Transactions implements OnInit {
  constructor(
    private transactionService: TransactionService,
    private translateService: TranslateService,
    private logger: Logger,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
    this.searchStr.pipe(debounceTime(200)).subscribe((value) => {
      this.filter.update((f) => ({ ...f, searchStr: value, page: 1 }));
      this.clearCache();
      this.loadTransactions();
    });
  }

  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      searchStr: currentFilter.searchStr,
      itemsPerPage: this.itemsPerPage(),
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  searchStr = new Subject<string>();

  transactions = signal<Transaction[] | null>(null);
  page = signal(1);
  itemsPerPage = signal(30);
  lastPage = signal(1);
  lastSelectedStatus: TransactionStatus | 'ALL' = 'ALL';
  transactionStatus = TransactionStatus;
  filter = signal<TransactionFilter>({
    page: 1,
    itemsPerPage: 30,
    orderBy: 'id',
    orderByVal: 'desc',
  });

  // Cache to store fetched pages
  private pageCache = new Map<number, Transaction[]>();
  private cachedFilterKey = '';

  async loadTransactions() {
    try {
      const currentFilter = this.filter();
      const currentPage = currentFilter.page || 1;
      const filterKey = this.getFilterKey();

      // Clear cache if filter changed
      if (this.cachedFilterKey !== filterKey) {
        this.clearCache();
        this.cachedFilterKey = filterKey;
      }
      if (this.pageCache.has(currentPage)) {
        this.transactions.set(this.pageCache.get(currentPage)!);
        return;
      }
      const {
        items,
        totalCount,
        itemsPerPage: returnedItemsPerPage,
      } = await this.transactionService.fetchTransactions(currentFilter);

      // Cache the fetched page
      this.pageCache.set(currentPage, items);
      this.transactions.set(items);
      this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.loadTransactions();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.loadTransactions();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.loadTransactions();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.loadTransactions();
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
  selectStatus(
    status: TransactionStatus | 'ALL',
    updateQueryParams: boolean = true,
    triggerFetch: boolean = true,
  ) {
    this.lastSelectedStatus = status;
    this.filter.update((f) => {
      const updatedFilter = {
        ...f,
        page: 1,
      };
      if (status === 'ALL') {
        delete (updatedFilter as TransactionFilter).status;
      } else {
        updatedFilter.status = status as TransactionStatus;
      }

      return updatedFilter;
    });

    this.clearCache();
    // Update query params to persist the selected status
    if (updateQueryParams) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { status: status === 'ALL' ? 'ALL' : status },
        queryParamsHandling: 'merge', // Preserve other query params if any
      });
    }

    if (triggerFetch) {
      this.loadTransactions();
    }
  }

  // Map display columns to API sort fields
  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      orderid: 'id',
      email: 'email',
      status: 'status',
      amount: 'amount',
      txnid: 'merchantTxnId',
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
    this.loadTransactions();
  }

  async onExportToExcel(): Promise<void> {
    try {
      const transactions = this.transactions();
      if (!transactions || transactions.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning') || 'Warning',
          text:
            this.translateService.instant('nodatatoexport') ||
            'No data to export',
        });
        return;
      }

      const exportData = transactions.map((transaction) => ({
        orderid: '#' + transaction.id,
        email:
          transaction.booking?.userDetails?.email ||
          transaction.user?.email ||
          '-',
        title:
          transaction.booking?.titleDetails?.name || transaction.title || '-',
        status: transaction.status || '-',
        amount: transaction.amount || 0,
        txnid:
          transaction.merchantTxnId || transaction.paymentGatewayTxnId || 'N/A',
      }));

      const headers: Record<string, string> = {
        orderid: this.translateService.instant('orderid') || 'Order ID',
        email: this.translateService.instant('email') || 'Email',
        title: this.translateService.instant('title') || 'Title',
        status: this.translateService.instant('status') || 'Status',
        amount: this.translateService.instant('amount') || 'Amount',
        txnid: this.translateService.instant('txnid') || 'Transaction ID',
      };

      const currentPage = this.filter().page || 1;
      const fileName = `transactions-page-${currentPage}-${format(
        new Date(),
        'dd-MM-yyyy',
      )}`;

      exportToExcel(exportData, fileName, headers, 'Transactions');

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
