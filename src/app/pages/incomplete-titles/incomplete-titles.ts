import { Component, OnDestroy, OnInit, signal, computed, Signal } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TitleService } from '../titles/title-service';
import { TitleCompleteness, Title, CreatePlatformIdentifier } from '../../interfaces/Titles';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
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

@Component({
  selector: 'app-incomplete-titles',
  imports: [
    SharedModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './incomplete-titles.html',
  styleUrl: './incomplete-titles.css',
})
export class IncompleteTitles implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  titles = signal<TitleCompleteness[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  filterType = signal<'all' | 'incomplete'>('incomplete');
  page = signal(1);
  itemsPerPage = signal(30);
  totalCount = signal(0);
  
  displayedColumns: string[] = [
    'name',
    'publishingType',
    'status',
    'missingDetails',
    'missingMedia',
    'actions',
  ];
  
  dataSource = new MatTableDataSource<TitleCompleteness>([]);
  
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

  async fetchTitles(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      
      const incompleteOnly = this.filterType() === 'incomplete';
      const currentPage = this.page();
      const currentItemsPerPage = this.itemsPerPage();
      
      const response = await this.titleService.getTitleCompleteness(
        incompleteOnly,
        currentPage,
        currentItemsPerPage
      );
      
      this.titles.set(response.items);
      this.totalCount.set(response.totalCount);
      this.dataSource.data = response.items;
    } catch (error: any) {
      console.error('Error fetching titles:', error);
      const errorMsg = this.translateService.instant('error') || 'An error occurred';
      this.errorMessage.set(errorMsg);
    } finally {
      this.isLoading.set(false);
    }
  }

  onFilterChange(value: 'all' | 'incomplete'): void {
    this.filterType.set(value);
    this.page.set(1);
    this.fetchTitles();
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.fetchTitles();
  }

  onItemsPerPageChange(newItemsPerPage: number): void {
    this.itemsPerPage.set(newItemsPerPage);
    this.page.set(1);
    this.fetchTitles();
  }

  totalPages = computed(() => {
    const total = this.totalCount();
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage) || 1;
  });

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

