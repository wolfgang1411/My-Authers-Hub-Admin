import { Component, Renderer2, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatButton, MatButtonModule } from '@angular/material/button';
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
  SalesCsvData,
  SalesType,
  Title,
  TitleStatus,
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

@Component({
  selector: 'app-royalties',
  imports: [
    LayoutModule,
    SharedModule,
    AngularSvgIconModule,
    RouterModule,
    MatButton,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    EarningTable,
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
    public userService: UserService
  ) {}

  lastPage = signal(1);

  filter = signal<EarningFilter>({
    page: 1,
    itemsPerPage: 10,
    searchStr: '',
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

  // Cache to store fetched pages
  private pageCache = new Map<number, Earnings[]>();
  private cachedFilterKey = '';
  lastSelectedSaleType: SalesType | null = null;
  salesTypes = SalesType;
  ngOnInit(): void {
    if (this.lastSelectedSaleType) {
      const saleType = this.lastSelectedSaleType;
      this.filter.update((f) => ({
        ...f,
        salesType: [saleType],
      }));
    }
    this.updateRoyaltyList();
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
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  async updateRoyaltyList() {
    const currentFilter = this.filter();
    const currentPage = currentFilter.page || 1;
    const filterKey = this.getFilterKey();

    // Clear cache if filter changed
    if (this.cachedFilterKey !== filterKey) {
      this.clearCache();
      this.cachedFilterKey = filterKey;
    }

    // Check if page is already cached
    if (this.pageCache.has(currentPage)) {
      this.earningList.set(this.pageCache.get(currentPage)!);
      return;
    }

    // Fetch from API
    console.log('Updating royalty list with filter:', currentFilter);
    const cleanedFilter = this.cleanFilter(currentFilter);
    const { items, totalCount, itemsPerPage: returnedItemsPerPage } =
      await this.salesService.fetchEarnings(cleanedFilter);

    // Cache the fetched page
    this.pageCache.set(currentPage, items);
    this.earningList.set(items);
    this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
  }
  selectSaleType(type: SalesType | null) {
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

  addRoyalty(data?: Partial<CreateSale & { availableTitles: number[] }>[]) {
    const dialog = this.dialog.open(AddSales, {
      data: {
        data,
        defaultTitles: this.titles(),
        onClose: () => dialog.close(),
        onSubmit: async (data: CreateSale[]) => {
          await this.salesService.createSalesMulti(data);
          await this.updateRoyaltyList();
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
          }
        )
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
}
