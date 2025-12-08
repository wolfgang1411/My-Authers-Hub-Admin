import { Component, computed, Signal, signal } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import {
  ApproveTitlePayload,
  CreateDistributionLink,
  CreatePlatformIdentifier,
  Title,
  TitleFilter,
  TitleResponse,
} from '../../interfaces/Titles';
import { SharedModule } from '../../modules/shared/shared-module';
import { TitleService } from './title-service';
import { RouterLink } from '@angular/router';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { SelectDistributionLinks } from '../../components/select-distribution-links/select-distribution-links';
import { format } from 'date-fns';
import { TitleStatus, User } from '../../interfaces';
import { ApproveTitle } from '../../components/approve-title/approve-title';
import { UserService } from '../../services/user';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { formatIsbn } from 'src/app/shared/utils/isbn.utils';
import { exportToExcel } from '../../common/utils/excel';
import { Logger } from '../../services/logger';

@Component({
  selector: 'app-titles',
  imports: [
    SharedModule,
    RouterLink,
    ListTable,
    MatIconModule,
    MatIconButton,
    MatButton,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './titles.html',
  styleUrl: './titles.css',
})
export class Titles {
  constructor(
    private titleService: TitleService,
    private translateService: TranslateService,
    private matDialog: MatDialog,
    private userService: UserService,
    private staticValueService: StaticValuesService,
    private translate: TranslateService,
    private logger: Logger
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  loggedInUser!: Signal<User | null>;

  titleDBStatus = computed(() => {
    console.log(this.staticValueService.staticValues(), 'Fdafsaf');

    return Object.keys(
      this.staticValueService.staticValues()?.TitleStatus || {}
    );
  });
  searchStr = new Subject<string>();
  lastSelectedStatus: TitleStatus | 'ALL' = 'ALL';
  selectStatus(status: TitleStatus | 'ALL') {
    this.lastSelectedStatus = status;
    this.filter.update((f) => ({
      ...f,
      status: status as TitleStatus,
      page: 1,
    }));
    this.clearCache();
    this.fetchTitleDetails();
  }
  titleStatus = TitleStatus;
  test!: Subject<string>;
  titles = signal<Title[]>([]);
  displayedColumns: string[] = [
    'name',
    'bookssold',
    'authors',
    'isbn',
    'launchdate',
    'status',
    'SelectedDistrbutions',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>();
  lastPage = signal(1);
  
  filter = signal<TitleFilter>({
    page: 1,
    itemsPerPage: 10,
    status: 'ALL' as any,
  });
  
  // Cache to store fetched pages
  private pageCache = new Map<number, Title[]>();
  private cachedFilterKey = '';
  
  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      status: currentFilter.status,
      searchStr: currentFilter.searchStr,
      itemsPerPage: currentFilter.itemsPerPage,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }
  
  fetchTitleDetails() {
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
      this.titles.set(this.pageCache.get(currentPage)!);
      this.mapDataList();
      return;
    }

    // Fetch from API
    this.titleService
      .getTitles(currentFilter)
      .then(({ items, totalCount, itemsPerPage: returnedItemsPerPage }) => {
        // Cache the fetched page
        this.pageCache.set(currentPage, items);
        this.titles.set(items);
        this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
        this.mapDataList();
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }
  
  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchTitleDetails();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchTitleDetails();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchTitleDetails();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.fetchTitleDetails();
  }

  getPageNumbers(): number[] {
    const currentPage = this.filter().page || 1;
    const totalPages = this.lastPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      }
    }

    return pages;
  }
  mapDataList() {
    const mapped = this.titles().map((title, idx) => ({
      ...title,
      isbn: `${title.isbnPrint ? formatIsbn(title.isbnPrint) : 'N/A'}<br>${
        title.isbnEbook ? formatIsbn(title.isbnEbook) : ''
      }`,
      pages:
        title.printing && title.printing.length
          ? title.printing[0].totalPages
          : 'N/A',

      authors:
        title.authors && title.authors.length
          ? title.authors
              .map(
                (author) =>
                  author.display_name ||
                  (author.author?.user.firstName || '') +
                    ' ' +
                    (author.author.user.lastName || '')
              )
              .join(' ,')
          : 'N/A',

      status: title.status,
      bookssold: title.copiesSold,
      launchdate: title.launch_date
        ? format(title.launch_date, 'dd-MM-yyyy')
        : 'N/A',
      SelectedDistrbutions:
        title.distribution && title.distribution.length
          ? title.distribution
              .map((link) => this.translate.instant(link.type))
              .join('<br>')
          : 'N/A',
      actions: '',
    }));

    this.dataSource.data = mapped;
  }

  ngOnInit(): void {
    this.fetchTitleDetails();
    this.searchStr.pipe(debounceTime(400)).subscribe((value) => {
      this.filter.update((f) => {
        const updated = { ...f };
        if (!value?.length) {
          delete updated.searchStr;
        } else {
          updated.searchStr = value;
        }
        updated.page = 1;
        return updated;
      });
      this.clearCache();
      this.fetchTitleDetails();
    });
  }

  async onClickApprove(title: Title) {
    if (title.printingOnly) {
      const { value } = await Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('areyousure'),
        html: this.translateService.instant('titleapprovewarning'),
        showCancelButton: true,
        confirmButtonText: this.translateService.instant('yes'),
        cancelButtonText: this.translateService.instant('no'),
      });

      if (!value) return;

      const response = await this.titleService.approveTitle(title.id, {
        platformIdentifier: [],
      });
      this.titles.update((titles) => {
        return titles.map((t) => (t.id === response.id ? response : t));
      });
      this.mapDataList();

      return;
    }

    if (!title.distribution || !title.distribution.length) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: this.translateService.instant('titledistributionsnotfound'),
      });
      return;
    }

    const dialog = this.matDialog.open(ApproveTitle, {
      maxWidth: '95vw',
      width: '90vw',
      maxHeight: '90vh',
      data: {
        onClose: () => dialog.close(),
        publishingType: title.publishingType,
        onSubmit: async (data: {
          platformIdentifier: CreatePlatformIdentifier[];
        }) => {
          try {
            const response = await this.titleService.approveTitle(
              title.id,
              data
            );
            this.titles.update((titles) => {
              return titles.map((t) => (t.id === response.id ? response : t));
            });
            this.mapDataList();
            dialog.close();
          } catch (error) {
            console.log(error);
          }
        },
      },
    });

    // const dialog = this.matDialog.open(SelectDistributionLinks, {
    //   data: {
    //     distribution: title.distribution,
    //     onClose: () => dialog.close(),
    //     onSave: async (data: ApproveTitlePayload[]) => {
    //       const response = await this.titleService.approveTitle(title.id, data);
    //       this.titles.update((titles) => {
    //         return titles.map((t) => (t.id === response.id ? response : t));
    //       });
    //       dialog.close();
    //     },
    //   },
    // });
  }

  async onClickReject(title: any) {
    console.log({ title });

    const { value } = await Swal.fire({
      icon: 'warning',
      title: this.translateService.instant('areyousure'),
      html: this.translateService.instant('rejettitlewarninghtml', {
        title: title.name,
      }),
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('yes'),
      cancelButtonText: this.translateService.instant('no'),
    });
    if (!value) return;

    const response = await this.titleService.rejectTitle(title.id);

    this.titles.update((titles) => {
      return titles.map((t) => (t.id === response.id ? response : t));
    });
    this.dataSource.data = this.dataSource.data.map((t) =>
      t.id === title.id ? { ...t, status: 'REJECTED' } : t
    );
  }

  async onClickDeleteTitle(title: Title) {
    const { value } = await Swal.fire({
      icon: 'warning',
      title: this.translateService.instant('areyousure'),
      html: this.translateService.instant('titledeletewarning', {
        name: title.name,
      }),
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('yes'),
      cancelButtonText: this.translateService.instant('no'),
      customClass: {
        confirmButton: '!bg-accent',
        cancelButton: '!bg-primary',
      },
    });
    if (!value) return;

    await this.titleService.deleteTitle(title.id);
    this.titles.update((titles) => titles.filter((t) => t.id !== title.id));
    this.dataSource.data = this.dataSource.data.filter(
      ({ id }) => id !== title.id
    );
  }

  async onExportToExcel(): Promise<void> {
    try {
      const titles = this.titles();
      if (!titles || titles.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning') || 'Warning',
          text:
            this.translateService.instant('nodatatoexport') ||
            'No data to export',
        });
        return;
      }

      const exportData = titles.map((title) => ({
        name: title.name || '-',
        isbn: `${title.isbnPrint ? formatIsbn(title.isbnPrint) : 'N/A'} / ${title.isbnEbook ? formatIsbn(title.isbnEbook) : 'N/A'}`,
        authors:
          title.authors && title.authors.length
            ? title.authors
                .map(
                  (author) =>
                    author.display_name ||
                    (author.author?.user.firstName || '') +
                      ' ' +
                      (author.author?.user.lastName || '')
                )
                .join(', ')
            : 'N/A',
        bookssold: title.copiesSold || 0,
        launchdate: title.launch_date
          ? format(new Date(title.launch_date), 'dd-MM-yyyy')
          : 'N/A',
        status: title.status || '-',
        SelectedDistrbutions:
          title.distribution && title.distribution.length
            ? title.distribution
                .map((link) => this.translate.instant(link.type))
                .join(', ')
            : 'N/A',
      }));

      const headers: Record<string, string> = {
        name: this.translateService.instant('name') || 'Name',
        isbn: this.translateService.instant('ISBN') || 'ISBN',
        authors: this.translateService.instant('author') || 'Authors',
        bookssold: this.translateService.instant('bookssold') || 'Books Sold',
        launchdate: this.translateService.instant('launchdate') || 'Launch Date',
        status: this.translateService.instant('status') || 'Status',
        SelectedDistrbutions:
          this.translateService.instant('SelectedDistrbutions') ||
          'Selected Distributions',
      };

      const currentPage = this.filter().page || 1;
      const fileName = `titles-page-${currentPage}-${format(
        new Date(),
        'dd-MM-yyyy'
      )}`;

      exportToExcel(exportData, fileName, headers, 'Titles');

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
