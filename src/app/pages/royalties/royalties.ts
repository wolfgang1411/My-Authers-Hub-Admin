import { Component, Renderer2, resource, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LayoutModule } from '@angular/cdk/layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {
  CreateSale,
  EarningFilter,
  SalesByPlatform,
  SalesByPlatformFilter,
  SalesCsvData,
  Title,
} from '../../interfaces';
import { debounceTime, Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { AddSales } from '../../components/add-sales/add-sales';
import { SalesService } from '../../services/sales';
import { Papa } from 'ngx-papaparse';
import { Logger } from '../../services/logger';
import { format, parse } from 'date-fns';
import { TitleService } from '../titles/title-service';
import { Earnings } from '../../interfaces/Earnings';
import { EarningTable } from '../../components/earning-table/earning-table';
import { UserService } from '../../services/user';
import { TranslateService } from '@ngx-translate/core';
import { exportToExcel } from '../../common/utils/excel';
import { SalesType } from '../../interfaces';
import { MatCardModule } from '@angular/material/card';
import { PlatformService } from 'src/app/services/platform';

@Component({
  selector: 'app-royalties',
  imports: [
    LayoutModule,
    SharedModule,
    AngularSvgIconModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatInputModule,
    EarningTable,
    MatCardModule,
  ],
  templateUrl: './royalties.html',
  styleUrl: './royalties.css',
})
export class Royalties {
  constructor(
    private salesService: SalesService,
    private dialog: MatDialog,
    private renderer2: Renderer2,
    private papa: Papa,
    private logger: Logger,
    private titleService: TitleService,
    public userService: UserService,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private platformService: PlatformService,
  ) {}

  lastPage = signal(1);

  salesByPlatformFilter = signal<SalesByPlatformFilter>({
    isEbookPlatform: true,
    isInventoryPlatform: true,
    isOtherPlatform: false,
  });
  filter = signal<EarningFilter>({
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
    orderBy: 'id',
    orderByVal: 'desc',
  });

  titles = signal<Title[]>([]);
  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(800))
    .subscribe((value) => {
      this.filter.update((f) => ({ ...f, searchStr: value, page: 1 }));
      this.clearCache();
      this.updateRoyaltyList();
    });
  earningList = signal<Earnings[]>([]);
  private pageCache = new Map<number, Earnings[]>();
  private cachedFilterKey = '';
  lastSelectedSaleType: SalesType | null = null;
  salesTypes = SalesType;

  salesByPlatform = signal<SalesByPlatform[]>([]);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const saleTypeParam = params['saleType'];
      if (
        saleTypeParam !== undefined &&
        saleTypeParam !== null &&
        saleTypeParam !== ''
      ) {
        if (saleTypeParam === 'null') {
          this.lastSelectedSaleType = null;
        } else if (
          Object.values(SalesType).includes(saleTypeParam as SalesType)
        ) {
          this.lastSelectedSaleType = saleTypeParam as SalesType;
        }
      }
      if (this.lastSelectedSaleType !== null) {
        this.filter.update((f) => ({
          ...f,
          salesType: [this.lastSelectedSaleType!],
        }));
      } else {
        this.filter.update((f) => {
          const updated = { ...f };
          delete updated.salesType;
          return updated;
        });
      }

      this.updateRoyaltyList();
    });
    this.fetchAndUpdateSalesByPlatform();
  }

  private getPlatformPriority(sale: {
    platformName: string;
    isEbookPlatform: boolean;
  }): number {
    if (sale.platformName.includes('amazon')) return 1;
    if (sale.platformName.includes('flipkart')) return 2;
    if (sale.platformName.includes('Old Dashboard')) return 50;
    if (!sale.isEbookPlatform) return 3;
    return 4; // ebook platforms
  }

  async fetchAndUpdateSalesByPlatform() {
    const platforms = this.platformService.platforms();
    console.log({ platforms });
    const sales = await this.salesService.fetchSalesByPlatform(
      this.salesByPlatformFilter(),
    );
    this.salesByPlatform.set(
      sales
        .map((sale) => {
          const platform = platforms.find(({ id }) => id === sale.platformId);
          return {
            ...sale,
            platformName:
              sale.platform === 'Old Dashboard'
                ? 'Old Dashboard'
                : (platform?.name?.toLowerCase() ?? ''),
            isEbookPlatform: !!platform?.isEbookPlatform,
          };
        })
        .sort(
          (a, b) => this.getPlatformPriority(a) - this.getPlatformPriority(b),
        ),
    );
  }

  private cleanFilter(filter: EarningFilter): EarningFilter {
    const cleaned: any = {};
    Object.keys(filter).forEach((key) => {
      const val = (filter as any)[key];
      if (val === undefined || val === null) {
        return;
      }
      if (Array.isArray(val)) {
        if (val.length > 0) {
          cleaned[key] = val;
        }
      } else if (typeof val === 'string') {
        if (val.trim() !== '') {
          cleaned[key] = val;
        }
      } else {
        cleaned[key] = val;
      }
    });
    return cleaned;
  }

  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      searchStr: currentFilter.searchStr,
      salesType: currentFilter.salesType,
      paidBefore: currentFilter.paidBefore,
      paidAfter: currentFilter.paidAfter,
      titleIds: currentFilter.titleIds,
      authorIds: currentFilter.authorIds,
      publisherIds: currentFilter.publisherIds,
      status: currentFilter.status,
      platforms: currentFilter.platforms,
      channals: currentFilter.channals,
      itemsPerPage: currentFilter.itemsPerPage,
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  async updateRoyaltyList(skipCache = false) {
    const currentFilter = this.filter();
    const currentPage = currentFilter.page || 1;
    const filterKey = this.getFilterKey();
    if (this.cachedFilterKey !== filterKey) {
      this.clearCache();
      this.cachedFilterKey = filterKey;
    }
    if (this.pageCache.has(currentPage) && !skipCache) {
      this.earningList.set(this.pageCache.get(currentPage)!);
      return;
    }
    console.log('Updating royalty list with filter:', currentFilter);
    const cleanedFilter = this.cleanFilter(currentFilter);
    const {
      items,
      totalCount,
      itemsPerPage: returnedItemsPerPage,
    } = await this.salesService.fetchEarnings(cleanedFilter);

    // Cache the fetched page
    this.pageCache.set(currentPage, items);
    this.earningList.set(items);
    this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
  }
  selectSaleType(type: SalesType | null, updateQueryParams: boolean = true) {
    this.lastSelectedSaleType = type;
    this.filter.update((f) => {
      const updated = { ...f };
      if (type === null) {
        delete updated.salesType;
      } else {
        updated.salesType = [type];
      }
      updated.page = 1;
      return updated;
    });
    this.clearCache();

    // Update query params to persist the selected sale type
    if (updateQueryParams) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { saleType: type === null ? null : type },
        queryParamsHandling: 'merge', // Preserve other query params if any
      });
    }

    this.updateRoyaltyList();
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.updateRoyaltyList();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.updateRoyaltyList();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.updateRoyaltyList();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.updateRoyaltyList();
  }

  getPageNumbers(): number[] {
    const currentPage = this.filter().page || 1;
    const totalPages = this.lastPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, current page, and pages around current
      if (currentPage <= 3) {
        // Near the beginning
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Map display columns to API sort fields
  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      type: 'salesType',
      title: 'titleName',
      'publisher/author': 'publisherOrAuthor', // Will sort by publisher name (can be enhanced)
      amount: 'amount',
      platform: 'platformName',
      quantity: 'quantity',
      addedAt: 'paidAt',
      holduntil: 'holdUntil',
      // Direct fields that can be sorted
      id: 'id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    return columnMap[column] || null;
  };

  isSortable = (column: string): boolean => {
    return this.getApiFieldName(column) !== null;
  };

  onSortChange(sort: { active: string; direction: 'asc' | 'desc' | '' }) {
    const apiFieldName = this.getApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.filter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.clearCache();
    this.updateRoyaltyList();
  }

  addRoyalty(data?: Partial<CreateSale & { availableTitles: number[] }>[]) {
    const dialog = this.dialog.open(AddSales, {
      data: {
        data,
        defaultTitles: this.titles(),
        onClose: () => dialog.close(),
        onSubmit: async (data: CreateSale[]) => {
          await this.salesService.createSalesMulti(data);
          await this.updateRoyaltyList(true);
          dialog.close();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            html: 'Sales added',
          });
        },
      },
      width: '80vw',
      maxWidth: '80vw',
    });
  }

  async processCSV(data: SalesCsvData[]) {
    const salesData: Partial<CreateSale & { availableTitles: number[] }>[] =
      await Promise.all(
        data.map(
          async ({
            Booking_Type: bookingType,
            Amount: amount,
            Delivery: delivery,
            Platform: platform,
            Quantity: quantity,
            Sold_At: soldAt,
            Title,
            Type: type,
          }) => {
            const { items } = await this.titleService.getTitles({
              searchStr: Title,
            });
            console.log({ soldAt });

            const soldAtDate = soldAt
              ? parse(soldAt, 'dd-MM-yyyy', new Date()) // referenceDate can be 'new Date()'
              : new Date();

            const formattedSoldAt = format(soldAtDate, 'yyyy-MM-dd');

            return {
              bookingType,
              platform,
              type,
              amount,
              quantity,
              delivery,
              titleId: items[0]?.id,
              availableTitles: items?.length ? items.map(({ id }) => id) : [],
              soldAt: formattedSoldAt,
            };
          },
        ),
      );

    this.addRoyalty(salesData);
  }

  onClickUploadCSV() {
    const input = this.renderer2.createElement('input');
    this.renderer2.setAttribute(input, 'type', 'file');
    this.renderer2.setAttribute(input, 'accept', '.csv');
    this.renderer2.appendChild(document.body, input);
    let fileSelected = false;
    const listener = this.renderer2.listen(input, 'change', (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file) {
        fileSelected = true;
        console.log('Selected CSV file:', file);
        const result = this.papa.parse(file, {
          header: true, // First row is headers
          skipEmptyLines: true, // Skip blank lines
          delimiter: ',', // Explicitly set comma delimiter
          transformHeader: (h) =>
            h.replaceAll(' ', '_').replaceAll(' ', '').trim(), // Remove any extra spaces in header
          complete: (results) => {
            this.processCSV(results.data);
            cleanup();
          },
          error: (error) => {
            this.logger.logError(error);
            cleanup();
          },
        });
      }

      cleanup();
    });

    // Handle dialog close (no file selected)
    const blurListener = this.renderer2.listen(window, 'focus', () => {
      // Give a small delay to ensure `change` event (if any) fires first
      setTimeout(() => {
        if (!fileSelected) {
          console.log('No file selected (dialog closed).');
          cleanup();
        }
      }, 200);
    });

    // Common cleanup logic
    const cleanup = () => {
      listener(); // remove change listener
      blurListener(); // remove focus listener
      this.renderer2.removeChild(document.body, input); // remove input
    };

    // Trigger file dialog
    input.click();
  }

  async onExportToExcel(): Promise<void> {
    try {
      const earnings = this.earningList();
      if (!earnings || earnings.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning') || 'Warning',
          text:
            this.translateService.instant('nodatatoexport') ||
            'No data to export',
        });
        return;
      }

      const user = this.userService.loggedInUser$();
      const isAuthor = user?.accessLevel === 'AUTHER';
      const showType = this.lastSelectedSaleType === null;

      // Map earnings data similar to earning-table component
      const exportData = earnings.map((earning) => {
        const salesTypeMap: Record<SalesType, string> = {
          [SalesType.SALE]: 'Sale',
          [SalesType.LIVE_SALE]: 'Live Sale',
          [SalesType.INVENTORY]: 'Inventory',
        };

        const dataRow: any = {
          title: earning.royalty.title.name || '-',
          'publisher/author':
            earning.royalty.publisher?.name ||
            earning.royalty.author?.user.firstName ||
            '-',
          amount: earning.amount,
          platform:
            earning.platformName ||
            this.translateService.instant(
              typeof earning.platform === 'string'
                ? earning.platform
                : (earning.platform as any)?.name || earning.platform || '',
            ),
          quantity: earning.quantity || 0,
          addedAt: earning.paidAt
            ? format(new Date(earning.paidAt), 'dd-MM-yyyy')
            : '-',
          holduntil: earning.holdUntil
            ? format(new Date(earning.holdUntil), 'dd-MM-yyyy')
            : '-',
        };

        if (showType) {
          dataRow.type = earning.salesType
            ? salesTypeMap[earning.salesType] || earning.salesType
            : '-';
        }

        return dataRow;
      });

      // Define headers with translations
      const headers: Record<string, string> = {
        title: this.translateService.instant('title') || 'Title',
        'publisher/author':
          this.translateService.instant('publisher/author') ||
          'Publisher/Author',
        amount: this.translateService.instant('amount') || 'Amount',
        platform: this.translateService.instant('platform') || 'Platform',
        quantity: this.translateService.instant('quantity') || 'Quantity',
        addedAt: this.translateService.instant('addedAt') || 'Added At',
        holduntil: this.translateService.instant('holduntil') || 'Hold Until',
      };

      if (showType) {
        headers['type'] = this.translateService.instant('salesType') || 'Type';
      }

      // Generate filename with current page
      const currentPage = this.filter().page || 1;
      const fileName = `royalties-page-${currentPage}-${format(
        new Date(),
        'dd-MM-yyyy',
      )}`;

      exportToExcel(exportData, fileName, headers, 'Royalties');

      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success') || 'Success',
        text:
          this.translateService.instant('exportsuccessful') ||
          'Data exported successfully',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          this.translateService.instant('errorexporting') ||
          'Failed to export data. Please try again.',
      });
    }
  }
}
