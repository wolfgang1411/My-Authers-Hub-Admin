import { Component, OnInit, signal } from '@angular/core';
import { TransactionService } from '../../services/transaction';
import { Transaction, TransactionFilter } from '../../interfaces';
import { TransactionTable } from '../../components/transaction-table/transaction-table';
import { SharedModule } from '../../modules/shared/shared-module';
import { Subject } from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-transactions',
  imports: [TransactionTable, SharedModule, MatButton],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css',
})
export class Transactions implements OnInit {
  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  searchStr = new Subject<string>();

  transactions = signal<Transaction[] | null>(null);
  filter: TransactionFilter = {
    page: 1,
    itemsPerPage: 30,
  };
  lastPage = signal<number | null>(1);

  async loadTransactions() {
    try {
      const { items, totalCount, itemsPerPage } =
        await this.transactionService.fetchTransactions(this.filter);
      this.transactions.set(items);
      this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }
}
