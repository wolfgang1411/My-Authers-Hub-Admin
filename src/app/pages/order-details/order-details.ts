import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Order, Transaction, TransactionStatus } from '../../interfaces';
import { OrderService } from '../../services/order';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatList, MatListItem } from '@angular/material/list';
import { TransactionTable } from '../../components/transaction-table/transaction-table';
import { MatIconModule } from '@angular/material/icon';
import { Back } from '../../components/back/back';
import { MatButtonModule } from '@angular/material/button';
import { Logger } from '../../services/logger';
import { TransactionService } from '../../services/transaction';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    SharedModule,
    MatList,
    MatListItem,
    TransactionTable,
    MatIconModule,
    Back,
    MatButtonModule,
  ],
  templateUrl: './order-details.html',
  styleUrl: './order-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetails implements OnInit {
  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private logger: Logger,
    private transactionService: TransactionService
  ) {
    this.route.params.subscribe(({ id }) => {
      this.orderId = Number(id);
    });
  }

  orderId!: number;
  order = signal<Order | null>(null);
  today = new Date();

  async ngOnInit() {
    const response = await this.orderService.fetchOrder(this.orderId);
    this.order.set(response);
  }

  getInvoice(transactions?: Transaction[]) {
    const successTransaction = transactions?.filter(
      (tx) => tx.status === TransactionStatus.SUCCESS
    );

    if (successTransaction && successTransaction.length) {
      this.transactionService
        .fetchTransaction(successTransaction[0].id.toString())
        .then((response: Transaction) => {
          const a = document.createElement('a');
          a.href = response.invoice;
          a.download = 'invoice.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        })
        .catch((error) => {
          this.logger.logError(error);
        });
    }
  }

  getCustomer() {
    const booking = this.order()?.bookings?.[0];
    return booking?.user || booking?.userDetails || this.order()?.user;
  }
}
