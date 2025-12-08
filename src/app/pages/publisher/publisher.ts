import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { debounceTime, Subject } from 'rxjs';
import {
  PublisherFilter,
  PublisherResponse,
  Publishers,
} from '../../interfaces/Publishers';
import { PublisherService } from './publisher-service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';
import { Validators } from '@angular/forms';
import { Invite } from '../../interfaces/Invite';
import Swal from 'sweetalert2';
import { DistributionDialog } from '../../components/distribution-dialog/distribution-dialog';
import { Distribution } from '../../interfaces/Distribution';
import { PublisherStatus, User } from '../../interfaces';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { ChangePassword } from '../../components/change-password/change-password';
import { UserService } from '../../services/user';
import { AuthService } from '../../services/auth';
import { TranslateService } from '@ngx-translate/core';
import { exportToExcel } from '../../common/utils/excel';
import { Logger } from '../../services/logger';
import { format } from 'date-fns';

@Component({
  selector: 'app-publisher',
  imports: [
    SharedModule,
    CommonModule,
    MatIconModule,
    MatButton,
    ListTable,
    RouterLink,
    MatIconButton,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './publisher.html',
  styleUrl: './publisher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Publisher implements OnInit {
  constructor(
    private publisherService: PublisherService,
    private dialog: MatDialog,
    private staticValueService: StaticValuesService,
    private userService: UserService,
    private authService: AuthService,
    private translateService: TranslateService,
    private logger: Logger
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }
  loggedInUser!: Signal<User | null>;
  publisherDBStatus = computed(() => {
    console.log(this.staticValueService.staticValues(), 'Fdafsaf');

    return Object.keys(
      this.staticValueService.staticValues()?.PuplisherStatus || {}
    );
  });
  searchStr = new Subject<string>();
  PublisherStatus = PublisherStatus;
  test!: Subject<string>;
  publishers = signal<Publishers[]>([]);
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = [
    'name',
    'nooftitles',
    'noofauthors',
    'email',
    'phonenumber',
    'actions',
  ];

  lastPage = signal(1);
  
  filter = signal<PublisherFilter>({
    page: 1,
    itemsPerPage: 10,
    status: 'ALL' as any,
  });
  
  // Cache to store fetched pages
  private pageCache = new Map<number, Publishers[]>();
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
  fetchPublishers(showLoader = true) {
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
      const cachedPublishers = this.pageCache.get(currentPage)!;
      this.publishers.set(cachedPublishers);
      this.mapPublishersToDataSource(cachedPublishers);
      return;
    }

    // Fetch from API
    this.publisherService
      .getPublishers(currentFilter, showLoader)
      .then(({ items, totalCount, itemsPerPage: returnedItemsPerPage }) => {
        items = items.filter(
          ({ user: { id } }) => id !== this.userService.loggedInUser$()?.id
        );

        // Cache the fetched page
        this.pageCache.set(currentPage, items);
        this.publishers.set(items);
        this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
        this.mapPublishersToDataSource(items);
      })
      .catch((error) => {
        console.error('Error fetching publishers:', error);
      });
  }
  
  private mapPublishersToDataSource(items: Publishers[]) {
    const mapped = items.map((publisher) => ({
      ...publisher,
      phonenumber: publisher.phoneNumber || publisher.user.phoneNumber,
      nooftitles: publisher.noOfTitles,
      noofauthors: publisher.noOfAuthors,
      actions: '',
    }));

    if (mapped.length > 0) {
      const filtrCol = { ...mapped[0] };
      delete (filtrCol as any).id;
      // if (this.dataSource.data.length === 0) {
      //   this.displayedColumns = Object.keys(filtrCol);
      // }
    }
    this.dataSource.data = mapped;
  }
  
  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchPublishers();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchPublishers();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchPublishers();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.fetchPublishers();
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

  onStatusChange(status: any) {
    this.filter.update((f) => ({ ...f, status, page: 1 }));
    this.clearCache();
    this.fetchPublishers();
  }

  ngOnInit(): void {
    this.fetchPublishers();
    this.searchStr.pipe(debounceTime(200)).subscribe((value) => {
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
      this.fetchPublishers(false);
    });
  }
  openDistributionDialog(publisherId: number) {
    const dialogRef = this.dialog.open(DistributionDialog, {
      data: {
        onSubmit: async (
          distributionData: Distribution[],
          allowCustomPrintingPrice?: boolean,
          allowAuthorCopyPrice?: boolean
        ) => {
          console.log(distributionData, 'distrubittton dta');
          const response = await this.publisherService.approvePublisher(
            distributionData,
            publisherId,
            allowCustomPrintingPrice,
            allowAuthorCopyPrice
          );
          if (response) {
            const updatedData = this.dataSource.data.map((item) =>
              item.id === publisherId
                ? { ...item, status: PublisherStatus.Active }
                : item
            );
            this.dataSource.data = updatedData;
            dialogRef.close();
            Swal.fire({
              title: 'success',
              text: 'The publisher has been approved successfully!',
              icon: 'success',
              heightAuto: false,
            });
          }
        },
        onClose: () => dialogRef.close(),
      },
    });
  }
  rejectPublisher(publisherId: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Once rejected, you will not be able to recover this account!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      heightAuto: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await this.publisherService.rejectPublisher(
          publisherId
        );
        if (response) {
          const updatedData = this.dataSource.data.map((item) =>
            item.id === publisherId
              ? { ...item, status: PublisherStatus.Rejected }
              : item
          );
          this.dataSource.data = updatedData;
          Swal.fire({
            text: 'The publisher has been rejected!',
            icon: 'success',
            title: 'success',
            heightAuto: false,
          });
        }
      }
    });
  }
  async updateStatus(publisherId: number, status: 'Active' | 'Deactivated') {
    const isDeactivating = status === 'Deactivated';

    const title = isDeactivating
      ? 'Deactivate Publisher?'
      : 'Activate Publisher?';
    const html = isDeactivating
      ? `
      <p>Once deactivated, this publisher will no longer be accessible.</p>
      <div class="flex items-center justify-center mt-4">
        <input type="checkbox" id="delistCheckbox" />
        <label for="delistCheckbox" class="ml-2">Also delist all titles</label>
      </div>
    `
      : 'This publisher account will be activated and made accessible again.';

    const confirmButtonText = isDeactivating
      ? 'Yes, deactivate it!'
      : 'Yes, activate it!';
    const cancelButtonText = 'Cancel';

    const result = await Swal.fire({
      title,
      html,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      focusConfirm: false,
      customClass: {
        confirmButton: '!bg-accent',
        cancelButton: '!bg-primary',
      },
      preConfirm: () => {
        if (isDeactivating) {
          const checkbox = (
            Swal.getPopup()?.querySelector(
              '#delistCheckbox'
            ) as HTMLInputElement
          )?.checked;
          return { delist: checkbox };
        }
        return { delist: false };
      },
      heightAuto: false,
    });

    console.log({ result });

    if (!result.isConfirmed) return;

    try {
      await this.publisherService.updatePublisherStatus(
        { status: status as any, delinkTitle: result.value['delist'] },
        publisherId
      );

      Swal.fire({
        title: 'Success',
        text: isDeactivating
          ? 'The publisher has been deactivated successfully.'
          : 'The publisher has been activated successfully.',
        icon: 'success',
        heightAuto: false,
      });

      this.dataSource.data = this.dataSource.data.map((item) =>
        item.id === publisherId ? { ...item, status } : item
      );
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Something went wrong while updating the status.',
        icon: 'error',
        heightAuto: false,
      });
    }
  }

  invitePublisher(): void {
    const dialogRef = this.dialog.open(InviteDialog, {
      data: {
        onSave: async (email: string) => {
          const inviteData = {
            email: email,
            type: 'PUBLISHER',
          };
          const response = await this.publisherService.sendInviteLink(
            inviteData as Invite
          );
          if (response) {
            dialogRef.close();
            Swal.fire({
              title: 'success',
              text: (response as any).message,
              icon: 'success',
              heightAuto: false,
            });
          }
        },
        onClose: () => dialogRef.close(),
        heading: 'Please enter Email Address',
        cancelButtonLabel: 'Cancel',
        saveButtonLabel: 'Send Invite',
        placeholder: 'abc@gmail.com',
        validators: [Validators.required, Validators.email],
      },
    });
  }

  onClickChangePassword(publisher: Publishers) {
    const dialog = this.dialog.open(ChangePassword, {
      data: {
        onClose: () => dialog.close(),
        onSubmit: async (password: string) => {
          console.log({ password });
          await this.authService.changeAuthorPublisherPassword(
            publisher.user.id,
            password
          );
          Swal.fire({
            icon: 'success',
            title: this.translateService.instant('success'),
            html: this.translateService.instant('passwordchangesuccessfully'),
          });
          dialog.close();
        },
      },
    });
  }

  async onExportToExcel(): Promise<void> {
    try {
      const publishers = this.publishers();
      if (!publishers || publishers.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning') || 'Warning',
          text:
            this.translateService.instant('nodatatoexport') ||
            'No data to export',
        });
        return;
      }

      // Only export the columns that are displayed in the UI (excluding 'actions')
      const exportColumns = this.displayedColumns.filter(
        (col) => col !== 'actions'
      );

      const exportData = publishers.map((publisher) => {
        const dataRow: Record<string, any> = {};

        exportColumns.forEach((col) => {
          switch (col) {
            case 'name':
              dataRow[col] = publisher.name || '-';
              break;
            case 'nooftitles':
              dataRow[col] = publisher.noOfTitles || 0;
              break;
            case 'noofauthors':
              dataRow[col] = publisher.noOfAuthors || 0;
              break;
            case 'email':
              dataRow[col] = publisher.email || publisher.user?.email || '-';
              break;
            case 'phonenumber':
              dataRow[col] =
                publisher.phoneNumber || publisher.user?.phoneNumber || '-';
              break;
            default:
              dataRow[col] = (publisher as any)[col] || '-';
          }
        });

        return dataRow;
      });

      const headers: Record<string, string> = {
        name: this.translateService.instant('name') || 'Name',
        nooftitles:
          this.translateService.instant('nooftitles') || 'No. of Titles',
        noofauthors:
          this.translateService.instant('noofauthors') || 'No. of Authors',
        email: this.translateService.instant('email') || 'Email',
        phonenumber:
          this.translateService.instant('phonenumber') || 'Phone Number',
      };

      const currentPage = this.filter().page || 1;
      const fileName = `publishers-page-${currentPage}-${format(
        new Date(),
        'dd-MM-yyyy'
      )}`;

      exportToExcel(exportData, fileName, headers, 'Publishers');

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
