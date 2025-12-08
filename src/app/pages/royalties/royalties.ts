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

  filter: EarningFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
  };

  titles = signal<Title[]>([]);
  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(800))
    .subscribe((value) => {
      this.filter.searchStr = value;
      this.filter.page = 1;
      this.updateRoyaltyList();
    });

  lastPage = signal(1);
  earningList = signal<Earnings[]>([]);
  lastSelectedSaleType: SalesType | null = null;
  salesTypes = SalesType;
  ngOnInit(): void {
    if (this.lastSelectedSaleType) {
      this.filter = {
        ...this.filter,
        salesType: [this.lastSelectedSaleType],
      };
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

  async updateRoyaltyList() {
    console.log('Updating royalty list with filter:', this.filter);
    const cleanedFilter = this.cleanFilter(this.filter);
    const { items, totalCount, itemsPerPage, page } =
      await this.salesService.fetchEarnings(cleanedFilter);

    this.earningList.update((earningList) => {
      return page > 1 && earningList.length
        ? [...earningList, ...items]
        : items;
    });
    this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
  }
  selectSaleType(type: SalesType | null) {
    this.lastSelectedSaleType = type;
    const updatedFilter: EarningFilter = {
      ...this.filter,
    };
    if (type === null) {
      delete updatedFilter.salesType;
    } else {
      updatedFilter.salesType = [type];
    }
    this.filter = updatedFilter;
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
