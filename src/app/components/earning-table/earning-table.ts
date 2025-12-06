import { Component, effect, input } from '@angular/core';
import { Earnings } from '../../interfaces/Earnings';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../list-table/list-table';
import { TranslateService } from '@ngx-translate/core';
import { formatCurrency } from '@angular/common';
import { format } from 'date-fns';
import { PlatForm } from '../../interfaces';
import { UserService } from 'src/app/services/user';

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

  constructor(
    private translateService: TranslateService,
    public userService: UserService
  ) {
    effect(async () => {
      const user = this.userService.loggedInUser$();
      const isAuthor = user?.accessLevel === 'AUTHER';
      const earnings = this.earnings();

      this.displayedColumns = isAuthor
        ? [
            'title',
            'publisher/author',
            'royaltyAmount',
            'amount',
            'platform',
            'quantity',
            'addedAt',
            'holduntil',
          ]
        : [
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

      const mappedData = earnings?.map((earning) => {
        // Check if this is an ebook platform
        const ebookPlatforms: PlatForm[] = [
          PlatForm.MAH_EBOOK,
          PlatForm.KINDLE,
          PlatForm.GOOGLE_PLAY,
        ];
        const isEbookPlatform = ebookPlatforms.includes(
          earning.platform.name as PlatForm
        );
        let customPrintMargin = 0;
        const isPublisherEarning =
          earning.royalty.publisher && !earning.royalty.author;
        const printing = earning.royalty.title.printing?.[0];

        if (!isEbookPlatform && isPublisherEarning && printing) {
          const printCost = Number(printing.printCost) || 0;
          const customPrintCost = printing.customPrintCost
            ? Number(printing.customPrintCost)
            : null;

          if (customPrintCost !== null && customPrintCost > printCost) {
            // Calculate margin per item and multiply by quantity
            customPrintMargin =
              (customPrintCost - printCost) * (earning.quantity || 1);
          }
        }

        return {
          ...earning,
          title: earning.royalty.title.name,
          'publisher/author':
            earning.royalty.publisher?.name ||
            earning.royalty.author?.user.firstName,
          amount: formatCurrency(earning.amount, 'en', '', 'INR'),
          customPrintMargin: isEbookPlatform
            ? '-'
            : customPrintMargin > 0
            ? formatCurrency(customPrintMargin, 'en', '', 'INR')
            : '-',
          royaltyAmount: isEbookPlatform
            ? formatCurrency(earning.amount, 'en', '', 'INR')
            : formatCurrency(
                earning.amount - customPrintMargin,
                'en',
                '',
                'INR'
              ),
          platform: this.translateService.instant(
            typeof earning.platform === 'string'
              ? earning.platform
              : (earning.platform as any)?.name || earning.platform || ''
          ),
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
