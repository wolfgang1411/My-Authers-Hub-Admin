import { Component, OnInit, signal } from '@angular/core';
import { TransactionService } from '../../services/transaction';
import { Transaction, TransactionFilter } from '../../interfaces';
import { TransactionTable } from '../../components/transaction-table/transaction-table';
import { SharedModule } from '../../modules/shared/shared-module';
import { debounceTime, Subject } from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-transactions',
  imports: [TransactionTable, SharedModule, MatButton, MatIcon],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css',
})
export class Transactions implements OnInit {
  constructor(private transactionService: TransactionService) {}

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
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  searchStr = new Subject<string>();

  transactions = signal<Transaction[] | null>(null);
  page = signal(1);
  itemsPerPage = signal(10);
  lastPage = signal(1);
  
  filter = signal<TransactionFilter>({
    page: 1,
    itemsPerPage: 10,
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

      // Check if page is already cached
      if (this.pageCache.has(currentPage)) {
        this.transactions.set(this.pageCache.get(currentPage)!);
        return;
      }

      // Fetch from API
      const { items, totalCount, itemsPerPage: returnedItemsPerPage } =
        await this.transactionService.fetchTransactions(currentFilter);
      
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
}

