import { Component, input, output, effect } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../list-table/list-table';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatTableDataSource } from '@angular/material/table';
import { Transaction } from '../../interfaces';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-transaction-table',
  imports: [SharedModule, ListTable, RouterModule, MatIcon, MatIconButton],
  templateUrl: './transaction-table.html',
  styleUrl: './transaction-table.css',
})
export class TransactionTable {
  transactions = input<Transaction[] | null | undefined>();
  isSortable = input<((column: string) => boolean) | undefined>();
  sortChange = output<{ active: string; direction: 'asc' | 'desc' | '' }>();

  displayedColumns: string[] = [
    'orderid',
    'email',
    'status',
    'amount',
    'txnid',
  ];
  dataSource = new MatTableDataSource<any>();

  constructor() {
    // 👇 react whenever transactions() changes
    effect(() => {
      const txs = this.transactions();
      console.log({ txs }, 'finaltransacccc');

      this.dataSource.data =
        txs?.map((transaction) => ({
          ...transaction,
          id: transaction.id,
          email: transaction.user.email,
          orderid: '#' + transaction.id,
          txnid: transaction.merchantTxnId || 'N/A',
        })) ?? [];
    });
  }
}
