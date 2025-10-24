import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  signal,
} from '@angular/core';
import { BookingService } from '../../services/booking';
import { ActivatedRoute } from '@angular/router';
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
}
