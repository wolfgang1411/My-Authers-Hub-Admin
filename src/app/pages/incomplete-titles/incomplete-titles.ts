import { Component, OnDestroy, OnInit, signal, computed, Signal, TemplateRef, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TitleService } from '../titles/title-service';
import { TitleCompleteness, Title, CreatePlatformIdentifier } from '../../interfaces/Titles';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { PublishingType, TitleMediaType, UserAccessLevel } from '../../interfaces';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { ApproveTitle } from '../../components/approve-title/approve-title';
import Swal from 'sweetalert2';
import { ListTable } from '../../components/list-table/list-table';
import { MatButton, MatIconButton } from '@angular/material/button';

interface TitleCompletenessFilter {
  incompleteOnly: boolean;
  page: number;
  itemsPerPage: number;
  orderBy?: string;
  orderByVal?: 'asc' | 'desc';
}

@Component({
  selector: 'app-incomplete-titles',
  imports: [
    SharedModule,
    MatProgressSpinnerModule,
    MatIconModule,
    RouterLink,
    ListTable,
    MatButton,
    MatIconButton,
  ],
  templateUrl: './incomplete-titles.html',
  styleUrl: './incomplete-titles.css',
})
export class IncompleteTitles implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  titles = signal<TitleCompleteness[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  lastPage = signal(1);
  
  filter = signal<TitleCompletenessFilter>({
    incompleteOnly: true,
    page: 1,
    itemsPerPage: 30,
    orderBy: 'id',
    orderByVal: 'desc',
  });
  
  displayedColumns: string[] = [
    'name',
    'publisherName',
    'publishingType',
    'status',
    'missingDetails',
    'missingMedia',
    'actions',
  ];
  
  dataSource = new MatTableDataSource<any>([]);
  
  // Cache to store fetched pages
  private pageCache = new Map<number, TitleCompleteness[]>();
  private cachedFilterKey = '';
  
  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      incompleteOnly: currentFilter.incompleteOnly,
      itemsPerPage: currentFilter.itemsPerPage,
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }
  
  publishingTypeLabels = computed<Record<PublishingType, string>>(() => {
    return {
      [PublishingType.ONLY_EBOOK]: this.translateService.instant('ebookonly') || 'Ebook Only',
      [PublishingType.ONLY_PRINT]: this.translateService.instant('printbookonly') || 'Print Only',
      [PublishingType.PRINT_EBOOK]: this.translateService.instant('print&ebook') || 'Print & Ebook',
    };
  });

  loggedInUser!: Signal<User | null>;

  isSuperAdmin = computed(() => {
    return this.loggedInUser()?.accessLevel === UserAccessLevel.SUPERADMIN;
  });

  constructor(
    private titleService: TitleService,
    private translateService: TranslateService,
    private userService: UserService,
    private matDialog: MatDialog
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  ngOnInit(): void {
    this.fetchTitles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async fetchTitles(showLoader = true): Promise<void> {
    try {
      if (showLoader) {
        this.isLoading.set(true);
      }
      this.errorMessage.set(null);
      
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
        const cachedTitles = this.pageCache.get(currentPage)!;
        this.titles.set(cachedTitles);
        this.mapTitlesToDataSource(cachedTitles);
        if (showLoader) {
          this.isLoading.set(false);
        }
        return;
      }
      
      const response = await this.titleService.getTitleCompleteness(
        currentFilter.incompleteOnly,
        currentPage,
        currentFilter.itemsPerPage,
        currentFilter.orderBy,
        currentFilter.orderByVal
      );
      
      // Cache the fetched page
      this.pageCache.set(currentPage, response.items);
      this.titles.set(response.items);
      this.lastPage.set(Math.ceil(response.totalCount / response.itemsPerPage));
      this.mapTitlesToDataSource(response.items);
    } catch (error: any) {
      console.error('Error fetching titles:', error);
      const errorMsg = this.translateService.instant('error') || 'An error occurred';
      this.errorMessage.set(errorMsg);
    } finally {
      if (showLoader) {
        this.isLoading.set(false);
      }
    }
  }

  private mapTitlesToDataSource(items: TitleCompleteness[]) {
    const mapped = items.map((title) => ({
      ...title,
      publisherName: title.publisherName || '-',
      publishingType: this.getPublishingTypeLabel(title.publishingType),
      status: this.getStatusText(title),
      missingDetails: this.getMissingDetailsLabel(title.missingBasicDetails),
      missingMedia: this.getMissingMediaLabel(title.missingMedia),
      actions: '',
    }));
    this.dataSource.data = mapped;
  }

  onFilterChange(value: 'all' | 'incomplete'): void {
    this.filter.update((f) => ({
      ...f,
      incompleteOnly: value === 'incomplete',
      page: 1,
    }));
    this.clearCache();
    this.fetchTitles();
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchTitles();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchTitles();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchTitles();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.fetchTitles();
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

  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'name',
      publisherName: 'publisherName',
      publishingType: 'publishingType',
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
    // fetchTitles will handle cache clearing based on filter key change
    // Don't show loader to avoid UI flicker - dataSource keeps old data until new data arrives
    this.fetchTitles(false);
  }

  getMissingDetailsLabel(missing: string[]): string {
    if (!missing || missing.length === 0) return '';
    return missing.map(key => this.translateService.instant(key) || key).join(', ');
  }

  getMissingMediaLabel(missing: TitleMediaType[]): string {
    if (!missing || missing.length === 0) return '';
    return missing.map(type => {
      const key = `mediaType.${type}`;
      const translated = this.translateService.instant(key);
      return translated !== key ? translated : type;
    }).join(', ');
  }

  getStatusClass(title: TitleCompleteness): string {
    if (title.isComplete) {
      return 'status-complete';
    }
    return 'status-incomplete';
  }

  getStatusText(title: TitleCompleteness): string {
    if (title.isComplete) {
      return this.translateService.instant('complete') || 'Complete';
    }
    return this.translateService.instant('incomplete') || 'Incomplete';
  }

  getPublishingTypeLabel(publishingType: PublishingType): string {
    const labels = this.publishingTypeLabels();
    return labels[publishingType] || publishingType;
  }

  async openSkuAndLinks(title: TitleCompleteness): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Fetch full title details
      const titleDetails = await this.titleService.getTitleById(title.id);
      
      const dialog = this.matDialog.open(ApproveTitle, {
        maxWidth: '95vw',
        width: '90vw',
        height: '90vh',
        maxHeight: '90vh',
        data: {
          onClose: () => dialog.close(),
          publishingType: titleDetails.publishingType,
          existingIdentifiers: titleDetails.titlePlatformIdentifier ?? [],
          distribution: titleDetails.distribution ?? [],
          isEditMode: true,
          skuNumber: titleDetails.skuNumber ?? undefined,
          onSubmit: async (data: {
            skuNumber?: string;
            platformIdentifier: CreatePlatformIdentifier[];
          }) => {
            try {
              // Update SKU and platform identifiers
              const payload = {
                skuNumber: data.skuNumber,
                platformIdentifier: data.platformIdentifier,
              };

              await this.titleService.approveTitle(title.id, payload);

              Swal.fire({
                icon: 'success',
                title: this.translateService.instant('success') || 'Success',
                text: this.translateService.instant('updatedsuccessfully') || 'Updated successfully',
                timer: 2000,
                showConfirmButton: false,
              });

              // Refresh the titles list
              this.fetchTitles();
              
              dialog.close();
            } catch (error: any) {
              console.error('Error updating SKU and links:', error);
              const errorMsg = this.translateService.instant('error') || 'An error occurred';
              Swal.fire({
                icon: 'error',
                title: errorMsg,
                text: error?.error?.error_description || error?.message || 'Failed to update',
              });
            }
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching title details:', error);
      const errorMsg = this.translateService.instant('error') || 'An error occurred';
      Swal.fire({
        icon: 'error',
        title: errorMsg,
        text: error?.error?.error_description || error?.message || 'Failed to load title details',
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
