import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookingService } from '../../services/booking';
import {
  Booking,
  Title,
  Transaction,
  TransactionStatus,
} from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatList, MatListItem } from '@angular/material/list';
import { MyDatePipe } from '../../pipes/my-date-pipe';
import { TransactionTable } from '../../components/transaction-table/transaction-table';
import { TitleService } from '../titles/title-service';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Back } from '../../components/back/back';
import { MatButtonModule } from '@angular/material/button';
import { RoyaltyTable } from '../../components/royalty-table/royalty-table';
import { Logger } from '../../services/logger';
import { InvoiceService } from '../../services/invoice-service';
import { TransactionService } from '../../services/transaction';

@Component({
  selector: 'app-booking-details',
  imports: [
    SharedModule,
    MatList,
    MatListItem,
    TransactionTable,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    Back,
    MatButtonModule,
    RoyaltyTable,
  ],
  templateUrl: './booking-details.html',
  styleUrl: './booking-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetails implements OnInit {
  constructor(
    private bookingService: BookingService,
    route: ActivatedRoute,
    private titleService: TitleService,
    private logger: Logger,
    private transactionService: TransactionService
  ) {
    route.params.subscribe(({ id }) => {
      this.bookingId = Number(id);
    });
  }
  bookingId!: number;
  booking = signal<Booking | null>(null);
  title = signal<Title | null>(null);
  today = new Date();
  async ngOnInit() {
    const response = await this.bookingService.fetchBooking(this.bookingId);
    if (response.title.id) {
      const titleResponse = await this.titleService.getTitleById(
        response.title.id
      );
      this.title.set(titleResponse);
      this.title.set({
        ...titleResponse,
        royalties: titleResponse.royalties?.map((txn) => ({
          ...txn,
          titlename: titleResponse.name,
        })),
      });
    }
    this.booking.set({
      ...response,
      transactions:
        response.transactions.map((txn) => ({
          ...txn,
          user: response.user || response.userDetails,
          booking: response,
          title: response.title.name,
        })) || [],
    });
  }
  getInvoice(transactions?: Transaction[]) {
    const successTransaction = transactions?.filter(
      (tx) => tx.status === TransactionStatus.SUCCESS
    );

    if (successTransaction && successTransaction.length) {
      const transaction = successTransaction[0];
      
      // Check if invoice is an array with pdfUrl
      let invoiceUrl: string | null = null;
      
      if (Array.isArray(transaction.invoice) && transaction.invoice.length > 0) {
        // Get the first invoice with pdfUrl (handle both pdfUrl and pdfurl)
        const invoice = transaction.invoice.find(
          (inv) => (inv as any).pdfUrl || (inv as any).pdfurl
        );
        invoiceUrl = (invoice as any)?.pdfUrl || (invoice as any)?.pdfurl || null;
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
        // Try fetching from API as fallback
        this.transactionService
          .fetchTransaction(transaction.id.toString())
          .then((response: Transaction) => {
            let url: string | null = null;
            if (Array.isArray(response.invoice) && response.invoice.length > 0) {
              const invoice = response.invoice.find(
                (inv) => (inv as any).pdfUrl || (inv as any).pdfurl
              );
              url = (invoice as any)?.pdfUrl || (invoice as any)?.pdfurl || null;
            } else if (typeof response.invoice === 'string') {
              url = response.invoice;
            }
            
            if (url) {
              const a = document.createElement('a');
              a.href = url;
              a.download = 'invoice.pdf';
              a.target = '_blank';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          })
          .catch((error) => {
            this.logger.logError(error);
          });
      }
    }
  }
}
