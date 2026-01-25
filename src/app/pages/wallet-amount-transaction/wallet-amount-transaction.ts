import { Component, OnInit, Signal, signal } from '@angular/core';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, Subject } from 'rxjs';
import { ListTable } from 'src/app/components/list-table/list-table';
import { User } from 'src/app/interfaces';
import {
  WalletamountTransaction,
  WalletAmountTransactionFilter,
} from 'src/app/interfaces/WalletTransaction';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import { WalletTransaction } from 'src/app/services/wallet-transaction';

@Component({
  selector: 'app-wallet-amount-transaction',
  imports: [
    SharedModule,
    ListTable,
    RouterModule,
    MatIconModule,
    MatIconButton,
    MatButtonModule,
  ],
  templateUrl: './wallet-amount-transaction.html',
  styleUrl: './wallet-amount-transaction.css',
})
export class WalletAmountTransaction implements OnInit {
  constructor(
    private walletTransactionService: WalletTransaction,
    private translate: TranslateService,
  ) {}

  searchStr = new Subject<string>();
  transactions = signal<WalletamountTransaction[]>([]);
  lastPage = signal(1);

  loggedInUser!: Signal<User | null>;
  filter = signal<WalletAmountTransactionFilter>({
    page: 1,
    itemsPerPage: 30,
    orderBy: 'id',
    orderByVal: 'desc',
  });

  displayedColumns = [
    'addedBy',
    'recipient',
    'email',
    'method',
    'type',
    'amount',
    'status',
  ];

  dataSource = new MatTableDataSource<any>([]);
  private pageCache = new Map<number, WalletamountTransaction[]>();
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

  ngOnInit(): void {
    this.fetchTransactions();
    this.searchStr.pipe(debounceTime(200)).subscribe((value) => {
      this.filter.update((f) => {
        const updated = { ...f };
        if (!value?.length) {
          delete updated.searchStr;
        } else {
          updated.searchStr = value;
        }
        updated.page = 1;
        return updated;
      });
      this.clearCache();
      this.fetchTransactions();
    });
  }

  setDataSource() {
    this.dataSource.data = this.transactions().map((tx) => {
      const user = tx.wallet.user;

      return {
        walletId: tx.wallet.id,
        addedBy: this.getAddedByName(tx), // ✅ FIXED
        recipient: user.publisher?.name || user.fullName,
        email: user.email,
        method: tx.addedMethod,
        type: tx.type,
        amount: `${tx.amount} INR`,
        status: tx.status,
      };
    });
  }

  async fetchTransactions() {
    const { items, totalCount, itemsPerPage } =
      await this.walletTransactionService.fetchWalletTransactions(
        this.filter(),
      );

    this.transactions.set(items);
    this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
    this.setDataSource();
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchTransactions();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchTransactions();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchTransactions();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.fetchTransactions();
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

  getAddedByName(tx: WalletamountTransaction): string {
    return tx.addedBy?.publisher?.name || tx.addedBy?.fullName || 'Superadmin';
  }
  // SORTING
  isSortable = (column: string): boolean => {
    return this.getApiFieldName(column) !== null;
  };

  getApiFieldName(column: string): string | null {
    const map: Record<string, string> = {
      addedBy: 'addedBy',
      recipient: 'wallet.user.fullName',
      email: 'wallet.user.email',
      method: 'addedMethod',
      type: 'type',
      amount: 'amount',
      status: 'status',
      createdAt: 'createdAt',
    };

    return map[column] || null;
  }
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
    this.fetchTransactions();
  }

  onExportToExcel() {
    // reuse your existing export helper
  }
}
