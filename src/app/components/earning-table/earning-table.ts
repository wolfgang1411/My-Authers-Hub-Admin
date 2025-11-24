import { Component, effect, input } from '@angular/core';
import { Earnings } from '../../interfaces/Earnings';
import { AuthorsService } from '../../pages/authors/authors-service';
import { PublisherService } from '../../pages/publisher/publisher-service';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../list-table/list-table';
import { TranslateService } from '@ngx-translate/core';
import { formatCurrency } from '@angular/common';
import { format } from 'date-fns';

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
    'royaltyAmount',
    'customPrintMargin',
    'amount',
    'platform',
    'quantity',
    'addedAt',
    'holduntil',
  ];
  dataSource = new MatTableDataSource<any>();

  constructor(private translateService: TranslateService) {
    effect(async () => {
      const earnings = this.earnings();

      const mappedData = earnings?.map((earning) => {
        // Calculate custom print margin if this is a publisher earning and printing details exist
        let customPrintMargin = 0;
        const isPublisherEarning = earning.royalty.publisher && !earning.royalty.author;
        const printing = earning.royalty.title.printing?.[0];
        
        if (isPublisherEarning && printing) {
          const printCost = Number(printing.printCost) || 0;
          const customPrintCost = printing.customPrintCost ? Number(printing.customPrintCost) : null;
          
          if (customPrintCost !== null && customPrintCost > printCost) {
            // Calculate margin per item and multiply by quantity
            customPrintMargin = (customPrintCost - printCost) * (earning.quantity || 1);
          }
        }

        return {
          ...earning,
          title: earning.royalty.title.name,
          'publisher/author':
            earning.royalty.publisher?.name ||
            earning.royalty.author?.user.firstName,
          amount: formatCurrency(earning.amount, 'en', '', 'INR'),
          customPrintMargin: customPrintMargin > 0 ? formatCurrency(customPrintMargin, 'en', '', 'INR') : '-',
          royaltyAmount: formatCurrency(earning.amount - customPrintMargin, 'en', '', 'INR'),
          platform: this.translateService.instant(earning.platform),
          quantity: earning.quantity || 0,
          addedAt: (() => {
            const date = earning.paidAt;
            if (!date) return undefined;
            return format(date, 'dd-MM-yyyy');
          })(),
          holduntil: (() => {
            const date = earning.holdUntil;
            if (!date) return undefined;
            return format(date, 'dd-MM-yyyy');
          })(),
        };
      });

      this.dataSource.data = mappedData || [];
    });
  }
}
