import { Component, computed, Signal, signal } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import {
  CreatePlatformIdentifier,
  Title,
  TitleFilter,
} from '../../interfaces/Titles';
import { SharedModule } from '../../modules/shared/shared-module';
import { TitleService } from './title-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { format } from 'date-fns';
import { PublishingType, TitleStatus, User, UserAccessLevel } from '../../interfaces';
import { ApproveTitle } from '../../components/approve-title/approve-title';
import { UserService } from '../../services/user';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { formatIsbn } from 'src/app/shared/utils/isbn.utils';
import { exportToExcel } from '../../common/utils/excel';
import { Logger } from '../../services/logger';
import { SharedTitlesService } from '../shared-titles/shared-titles-service';

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
    private logger: Logger,
    private route: ActivatedRoute,
    private router: Router,
    private sharedTitlesService: SharedTitlesService
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  loggedInUser!: Signal<User | null>;

  isSuperAdmin = computed(() => {
    return this.loggedInUser()?.accessLevel === UserAccessLevel.SUPERADMIN;
  });

  titleDBStatus = computed(() => {
    console.log(this.staticValueService.staticValues(), 'Fdafsaf');

    return Object.keys(
      this.staticValueService.staticValues()?.TitleStatus || {}
    );
  });
  publishingTypes = computed<PublishingType[]>(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.PublishingType || {}
    ) as PublishingType[];
  });
  searchStr = new Subject<string>();
  lastSelectedStatus: TitleStatus | 'ALL' = 'ALL';
  lastSelectedPublishingType: PublishingType | 'ALL' = 'ALL';
  selectStatus(
    status: TitleStatus | 'ALL',
    updateQueryParams: boolean = true,
    triggerFetch: boolean = true
  ) {
    this.lastSelectedStatus = status;
    this.filter.update((f) => ({
      ...f,
      status: status as TitleStatus,
      page: 1,
    }));
    this.clearCache();

    // Update query params to persist the selected status
    if (updateQueryParams) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { status: status === 'ALL' ? 'ALL' : status },
        queryParamsHandling: 'merge', // Preserve other query params if any
      });
    }

    if (triggerFetch) {
      this.fetchTitleDetails();
    }
  }

  selectPublishingType(
    publishingType: PublishingType | 'ALL',
    updateQueryParams: boolean = true,
    triggerFetch: boolean = true
  ) {
    this.lastSelectedPublishingType = publishingType;
    this.filter.update((f) => {
      const updated = { ...f, page: 1 };
      if (publishingType === 'ALL') {
        delete (updated as any).publishingType;
      } else {
        updated.publishingType = publishingType;
      }
      return updated;
    });
    this.clearCache();

    if (updateQueryParams) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          publishingType: publishingType === 'ALL' ? 'ALL' : publishingType,
        },
        queryParamsHandling: 'merge',
      });
    }

    if (triggerFetch) {
      this.fetchTitleDetails();
    }
  }
  titleStatus = TitleStatus;
  publishingType = PublishingType;
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
    itemsPerPage: 30,
    status: 'ALL' as any,
    orderBy: 'id',
    orderByVal: 'desc',
  });

  // Cache to store fetched pages
  private pageCache = new Map<number, Title[]>();
  private cachedFilterKey = '';

  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      status: currentFilter.status,
      publishingType: (currentFilter as any).publishingType,
      searchStr: currentFilter.searchStr,
      itemsPerPage: currentFilter.itemsPerPage,
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }
  // Map display columns to API sort fields
  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'name',
      bookssold: 'copiesSold', // handled in API as special case
      isbn: 'isbnPrint',
      launchdate: 'launch_date',
      status: 'status',
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
    this.fetchTitleDetails();
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
    // Read status from query params
    this.route.queryParams.subscribe((params) => {
      const statusParam = params['status'];
      const publishingTypeParam = params['publishingType'];

      const isValidStatus =
        statusParam &&
        (statusParam === 'ALL' ||
          Object.values(TitleStatus).includes(statusParam as TitleStatus));
      const isValidPublishingType =
        publishingTypeParam &&
        (publishingTypeParam === 'ALL' ||
          Object.values(PublishingType).includes(
            publishingTypeParam as PublishingType
          ));

      const initialStatus: TitleStatus | 'ALL' = isValidStatus
        ? statusParam === 'ALL'
          ? 'ALL'
          : (statusParam as TitleStatus)
        : 'ALL';
      const initialPublishingType: PublishingType | 'ALL' =
        isValidPublishingType
          ? publishingTypeParam === 'ALL'
            ? 'ALL'
            : (publishingTypeParam as PublishingType)
          : 'ALL';

      const shouldUpdateStatus = this.lastSelectedStatus !== initialStatus;
      const shouldUpdatePublishing =
        this.lastSelectedPublishingType !== initialPublishingType;

      if (shouldUpdateStatus) {
        this.selectStatus(initialStatus, false, false);
      }

      if (shouldUpdatePublishing) {
        this.selectPublishingType(initialPublishingType, false, false);
      }

      // Fetch once after applying both filters (or for first load)
      this.fetchTitleDetails();
    });

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
        skuNumber: undefined,
        platformIdentifier: [],
      });
      // Clear cache to ensure fresh data on next fetch
      this.clearCache();
      // Update local state immediately for instant UI update
      this.titles.update((titles) => {
        return titles.map((t) => (t.id === response.id ? response : t));
      });
      this.mapDataList();
      // Refresh current page data from server to ensure consistency
      this.fetchTitleDetails();

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
      height: '90vh',
      maxHeight: '90vh',
      data: {
        onClose: () => dialog.close(),
        publishingType: title.publishingType,
        existingIdentifiers: (title.titlePlatformIdentifier ?? []).map(
          (tpi) => ({
            platformName: tpi.platform?.name || '',
            type: tpi.type || (tpi.platform?.isEbookPlatform ? 'EBOOK' : 'PRINT') as 'EBOOK' | 'PRINT',
            distributionLink: tpi.distributionLink || undefined,
          })
        ),
        distribution: title.distribution ?? [],
        onSubmit: async (data: {
          skuNumber?: string;
          platformIdentifier: CreatePlatformIdentifier[];
        }) => {
          try {
            const response = await this.titleService.approveTitle(
              title.id,
              data
            );
            // Clear cache to ensure fresh data on next fetch
            this.clearCache();
            // Update local state immediately for instant UI update
            this.titles.update((titles) => {
              return titles.map((t) => (t.id === response.id ? response : t));
            });
            this.mapDataList();
            dialog.close();
            // Refresh current page data from server to ensure consistency
            this.fetchTitleDetails();
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
        isbn: `${title.isbnPrint ? formatIsbn(title.isbnPrint) : 'N/A'} / ${
          title.isbnEbook ? formatIsbn(title.isbnEbook) : 'N/A'
        }`,
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
        launchdate:
          this.translateService.instant('launchdate') || 'Launch Date',
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

  async onClickShareTitle(title: Title): Promise<void> {
    try {
      if (!title.id || title.status !== TitleStatus.APPROVED) {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Error',
          text:
            this.translateService.instant('onlyapprovedtitlescanbeshared') ||
            'Only approved titles can be shared',
        });
        return;
      }

      const sharedTitle =
        await this.sharedTitlesService.createSharedTitle(title.id);

      // Generate the share URL
      const shareUrl = `${window.location.origin}/shared-title-view/${sharedTitle.code}`;

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        Swal.fire({
          icon: 'success',
          title:
            this.translateService.instant('linkcopied') || 'Link Copied',
          html: `${this.translateService.instant('sharelinkcopied') || 'Share link copied to clipboard!'}<br><br><small>${this.translateService.instant('linkvaliduntil') || 'Link valid until'}: ${sharedTitle.sharedUntil ? new Date(sharedTitle.sharedUntil).toLocaleDateString() : 'N/A'}</small>`,
          showConfirmButton: true,
        });
      } catch (clipboardError) {
        // Fallback for browsers that don't support clipboard API
        console.error('Clipboard error:', clipboardError);
        Swal.fire({
          icon: 'info',
          title: this.translateService.instant('sharelink') || 'Share Link',
          html: `<div style="word-break: break-all;">${shareUrl}</div><br><small>${this.translateService.instant('linkvaliduntil') || 'Link valid until'}: ${sharedTitle.sharedUntil ? new Date(sharedTitle.sharedUntil).toLocaleDateString() : 'N/A'}</small>`,
          confirmButtonText:
            this.translateService.instant('close') || 'Close',
        });
      }
    } catch (error) {
      console.error('Error sharing title:', error);
    }
  }
}
