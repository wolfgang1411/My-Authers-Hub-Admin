import { Component, input, effect } from '@angular/core';
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

  displayedColumns: string[] = [
    'orderid',
    'email',
    'title',
    'status',
    'amount',
    'txnid',
  ];
  dataSource = new MatTableDataSource<any>();

  constructor() {
    // 👇 react whenever transactions() changes
    effect(() => {
      const txs = this.transactions();
      console.log({ txs });

      this.dataSource.data =
        txs?.map((transaction) => ({
          id: transaction.id,
          bookingId: transaction.booking?.id,
          userId: transaction.booking?.userDetails?.id,
          titleId: transaction.booking?.title?.id,
          orderID: '#' + transaction.id,
          orderid: '#' + transaction.id,
          email: transaction.booking?.userDetails?.email,
          title: transaction.booking?.titleDetails?.name,
          status: transaction.status,
          amount: transaction.amount + ' INR',
          txnid: transaction.merchantTxnId || 'N/A',
        })) ?? [];
    });
  }
}
