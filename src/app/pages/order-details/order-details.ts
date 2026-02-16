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
import { UserService } from '../../services/user';
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
    private translateService: TranslateService,
    private userService: UserService,
  ) {
    this.route.params.subscribe(({ id }) => {
      this.orderId = Number(id);
    });
  }

  orderId!: number;
  order = signal<Order | null>(null);
  today = new Date();
  isSuperAdmin = computed(() => {
    return this.userService.loggedInUser$()?.accessLevel === 'SUPERADMIN';
  });
  deliveryStatusOptions = computed<DeliveryStatus[]>(() => {
    const enums = this.staticValuesService.staticValues()?.DeliveryStatus || {};
    return Object.keys(enums).map(
      (key) => enums[key as keyof typeof enums] as DeliveryStatus,
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

  async onCancel(refund: boolean) {
    if (!this.order()?.id) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: this.translateService.instant('areyousure') || 'Are you sure?',
      text:
        (refund
          ? this.translateService.instant('cancelandrefund')
          : this.translateService.instant('cancelorder')) ||
        'This action cannot be undone',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('yes') || 'Yes',
      cancelButtonText: this.translateService.instant('no') || 'No',
    });

    if (result.isConfirmed) {
      try {
        await this.orderService.cancelOrder(this.order()!.id, refund);
        const refreshed = await this.orderService.fetchOrder(this.order()!.id);
        this.order.set(refreshed);
        Swal.fire({
          icon: 'success',
          title:
            this.translateService.instant('statusupdated') || 'Status updated',
          text:
            this.translateService.instant('order') +
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
  }

  async getInvoice() {
    const transactions = this.order()?.transactions;
    const successTransaction = transactions?.filter(
      (tx) => tx.status === TransactionStatus.SUCCESS,
    );

    if (successTransaction && successTransaction.length) {
      const transaction = successTransaction[0];

      if (!transaction.invoice || !transaction.invoice.length) {
        const inv = await this.transactionService.getInvoice(transaction.id);
        if (inv) {
          transaction.invoice = [inv];
          this.order.set({ ...this.order()!, transactions: [transaction] }); // Trigger change detection
        }
      }

      // Check if invoice is an array with pdfUrl
      let invoiceUrl: string | null = null;

      if (
        Array.isArray(transaction.invoice) &&
        transaction.invoice.length > 0
      ) {
        // Get the first invoice with pdfUrl (handle both pdfUrl and pdfurl)
        const invoice = transaction.invoice.find(
          (inv) => (inv as any).pdfUrl || (inv as any).pdfurl,
        );
        invoiceUrl =
          (invoice as any)?.pdfUrl || (invoice as any)?.pdfurl || null;
      } else if (typeof transaction.invoice === 'string') {
        // Fallback to string invoice (legacy)
        invoiceUrl = transaction.invoice;
      }

      if (invoiceUrl) {
        const a = document.createElement('a');
        a.href = invoiceUrl;
        a.download = 'invoice.pdf';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('error') || 'Error',
          text:
            this.translateService.instant('invoicenotavailable') ||
            'Invoice not available',
        });
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('error') || 'Error',
        text:
          this.translateService.instant('invoicenotavailable') ||
          'Invoice not available',
      });
    }
  }

  getCustomer() {
    const booking = this.order()?.bookings?.[0];
    return booking?.user || booking?.userDetails || this.order()?.user;
  }
}
