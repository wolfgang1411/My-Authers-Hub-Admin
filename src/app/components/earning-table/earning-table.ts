import { Component, effect, input, output } from '@angular/core';
import { Earnings } from '../../interfaces/Earnings';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../list-table/list-table';
import { TranslateService } from '@ngx-translate/core';
import { formatCurrency } from '@angular/common';
import { format } from 'date-fns';
import { PlatForm, SalesType } from '../../interfaces';
import { UserService } from 'src/app/services/user';

@Component({
  selector: 'app-earning-table',
  imports: [ListTable],
  templateUrl: './earning-table.html',
  styleUrl: './earning-table.css',
})
export class EarningTable {
  earnings = input<Earnings[] | null | undefined>();
  showTypeColumn = input<boolean>(false);
  isSortable = input<((column: string) => boolean) | undefined>();
  sortChange = output<{ active: string; direction: 'asc' | 'desc' | '' }>();
  displayedColumns: string[] = [
    'transactionId',
    'title',
    'publisher/author',
    'amount',
    'platform',
    'quantity',
    'addedAt',
    'holduntil',
  ];
  dataSource = new MatTableDataSource<any>();

  constructor(
    private translateService: TranslateService,
    public userService: UserService,
  ) {
    effect(async () => {
      const user = this.userService.loggedInUser$();
      const isAuthor = user?.accessLevel === 'AUTHER';
      const earnings = this.earnings();
      const showType = this.showTypeColumn();

      const baseColumns = [
        'transactionId',
        'title',
        'publisher/author',
        'amount',
        'platform',
        'quantity',
        'addedAt',
        'holduntil',
      ];

      this.displayedColumns = showType ? ['type', ...baseColumns] : baseColumns;

      const mappedData = earnings?.map((earning) => {
        const salesTypeMap: Record<SalesType, string> = {
          [SalesType.SALE]: 'Sale',
          [SalesType.LIVE_SALE]: 'Live Sale',
          [SalesType.INVENTORY]: 'Inventory',
        };

        return {
          ...earning,
          transactionId: `#RO1500${earning.id}`,
          type: earning.salesType
            ? salesTypeMap[earning.salesType] || earning.salesType
            : '-',
          title: earning.royalty.title.name,
          'publisher/author':
            earning.royalty.publisher?.name ||
            earning.royalty.author?.user.firstName,
          amount: formatCurrency(
            Number(earning.amount || 0),
            'en-IN',
            '₹',
            'INR',
            '1.0-2',
          ),
          platform:
            earning.platformName ||
            this.translateService.instant(
              typeof earning.platform === 'string'
                ? earning.platform
                : (earning.platform as any)?.name || earning.platform || '',
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
