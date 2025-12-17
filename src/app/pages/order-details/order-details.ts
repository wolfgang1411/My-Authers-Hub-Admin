import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  DeliveryStatus,
  Order,
  Transaction,
  TransactionStatus,
} from '../../interfaces';
import { OrderService } from '../../services/order';
import { SharedModule } from '../../modules/shared/shared-module';
import { TransactionTable } from '../../components/transaction-table/transaction-table';
import { MatIconModule } from '@angular/material/icon';
import { Back } from '../../components/back/back';
import { MatButtonModule } from '@angular/material/button';
import { Logger } from '../../services/logger';
import { TransactionService } from '../../services/transaction';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StaticValuesService } from '../../services/static-values';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    SharedModule,
    TransactionTable,
    MatIconModule,
    Back,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
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
    private transactionService: TransactionService,
    private staticValuesService: StaticValuesService,
    private translateService: TranslateService
  ) {
    this.route.params.subscribe(({ id }) => {
      this.orderId = Number(id);
    });
  }

  orderId!: number;
  order = signal<Order | null>(null);
  today = new Date();
  deliveryStatusOptions = computed<DeliveryStatus[]>(() => {
    const enums = this.staticValuesService.staticValues()?.DeliveryStatus || {};
    return Object.keys(enums).map(
      (key) => enums[key as keyof typeof enums] as DeliveryStatus
    );
  });

  async ngOnInit() {
    const response = await this.orderService.fetchOrder(this.orderId);
    this.order.set(response);
  }

  canChangeDeliveryStatus(status?: DeliveryStatus) {
    return status !== 'RETURNED' && status !== 'CANCELLED';
  }

  async changeDeliveryStatus(status: DeliveryStatus) {
    if (!this.order()?.id || !this.canChangeDeliveryStatus(status)) return;
    try {
      await this.orderService.updateDeliveryStatus(this.order()!.id, status);
      const refreshed = await this.orderService.fetchOrder(this.order()!.id);
      this.order.set(refreshed);
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
      console.log(error);
      //   this.logger.logError(error);
    }
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
