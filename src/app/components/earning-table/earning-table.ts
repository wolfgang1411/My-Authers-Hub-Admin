import { Component, effect, input } from '@angular/core';
import { Earnings } from '../../interfaces/Earnings';
import { AuthorsService } from '../../pages/authors/authors-service';
import { PublisherService } from '../../pages/publisher/publisher-service';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../list-table/list-table';
import { TranslateService } from '@ngx-translate/core';
import { formatCurrency } from '@angular/common';

@Component({
  selector: 'app-earning-table',
  imports: [ListTable],
  templateUrl: './earning-table.html',
  styleUrl: './earning-table.css',
})
export class EarningTable {
  earnings = input<Earnings[] | null | undefined>();
  displayedColumns: string[] = [
    'title',
    'publisher/author',
    'amount',
    'channal',
    'platform',
    'paidAt/holduntill',
  ];
  dataSource = new MatTableDataSource<any>();

  constructor(private translateService: TranslateService) {
    effect(async () => {
      const earnings = this.earnings();

      const mappedData = earnings?.map((earning) => ({
        ...earning,
        title: earning.royalty.title.name,
        'publisher/author':
          earning.royalty.publisher?.name ||
          earning.royalty.author?.user.firstName,
        amount: formatCurrency(earning.amount, 'en', '', 'INR'),
        channal: this.translateService.instant(earning.channal),
        platform: this.translateService.instant(earning.platform),
        'paidAt/holduntill': earning.holdUntil || earning.paidAt,
      }));

      this.dataSource.data = mappedData || [];
    });
  }
}
