import {
  Component,
  computed,
  Signal,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { AuthorsService } from './authors-service';
import { debounceTime, Subject } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import { Author, AuthorFilter, AuthorStatus, User } from '../../interfaces';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../../components/list-table/list-table';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatIconButton } from '@angular/material/button';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';
import { Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { PublisherService } from '../publisher/publisher-service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { ChangePassword } from '../../components/change-password/change-password';
import { AuthService } from '../../services/auth';
import { TranslateService } from '@ngx-translate/core';
import { TitleService } from '../titles/title-service';
import { MatMenuModule } from '@angular/material/menu';
import { SalesService } from '../../services/sales';
import { AuthorTitleList } from '../../components/author-title-list/author-title-list';
import { UserService } from 'src/app/services/user';
import { exportToExcel } from '../../common/utils/excel';
import { format } from 'date-fns';
import { Logger } from '../../services/logger';

@Component({
  selector: 'app-authors',
  imports: [
    SharedModule,
    ListTable,
    RouterLink,
    MatIcon,
    MatButton,
    MatIconButton,
    MatFormFieldModule,
    MatSelectModule,
    MatMenuModule,
    AuthorTitleList,
  ],
  templateUrl: './authors.html',
  styleUrl: './authors.css',
})
export class Authors {
  constructor(
    private authorService: AuthorsService,
    private dialog: MatDialog,
    private publisherService: PublisherService,
    private staticValueService: StaticValuesService,
    private authService: AuthService,
    private translateService: TranslateService,
    private titleService: TitleService,
    private salesService: SalesService,
    private userService: UserService,
    private logger: Logger
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }
  loggedInUser!: Signal<User | null>;
  searchStr = new Subject<string>();
  @ViewChild('nameRowMenu') nameRowMenu!: TemplateRef<any>;
  test!: Subject<string>;
  authors = signal<Author[]>([]);
  authorTitles = signal<Record<string, any[]>>({});
  authorBooksSold = signal<Record<string, any[]>>({});

  publishers = signal<{ [id: number]: any }>({});
  displayedColumns: string[] = [
    'name',
    'numberoftitles',
    'bookssold',
    'royaltiesearned',
    'status',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>();
  AuthorStatus = AuthorStatus;
  authorRowMenus = signal<Record<string, TemplateRef<any>>>({});

  @ViewChild('numberOfTitlesMenu') numberOfTitlesMenu!: TemplateRef<any>;
  @ViewChild('booksSoldMenu') booksSoldMenu!: TemplateRef<any>;
  lastPage = signal(1);
  
  filter = signal<AuthorFilter>({
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
    showTotalEarnings: true,
  });
  
  // Cache to store fetched pages
  private pageCache = new Map<number, Author[]>();
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
  ngAfterViewInit() {
    this.authorRowMenus.set({
      numberoftitles: this.numberOfTitlesMenu,
      bookssold: this.booksSoldMenu,
    });
  }
  expandedAuthorId = signal<number | null>(null);

  toggleExpand(id: number) {
    if (this.expandedAuthorId() === id) {
      this.expandedAuthorId.set(null);
      return;
    }
    this.expandedAuthorId.set(id);
    this.fetchTitlesByAuthor(id);
  }
  getAuthorNameById(id: number) {
    const a = this.authors().find((x) => x.id === id);
    return a ? a.user.firstName + ' ' + a.user.lastName : '';
  }
  fetchAuthors(showLoader = true) {
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
      const cachedAuthors = this.pageCache.get(currentPage)!;
      this.authors.set(cachedAuthors);
      this.mapAuthorsToDataSource(cachedAuthors);
      return;
    }

    // Fetch from API
    this.authorService
      .getAuthors(currentFilter, showLoader)
      .then(({ items, totalCount, itemsPerPage: returnedItemsPerPage }) => {
        // Cache the fetched page
        this.pageCache.set(currentPage, items);
        this.authors.set(items);
        this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
        this.mapAuthorsToDataSource(items);
      })
      .catch((error) => {
        console.error('Error fetching authors:', error);
      });
  }
  
  private mapAuthorsToDataSource(items: Author[]) {
    const mapped = items.map((author, idx) => ({
      ...author,
      name: author.user.firstName + ' ' + author.user.lastName,
      numberoftitles: author.noOfTitles,
      bookssold: author.booksSold,
      royaltiesearned: Number(author.totalEarning || 0).toFixed(2),
      actions: '',
    }));
    this.dataSource.data = mapped;
  }
  
  onStatusChange(status: any) {
    this.filter.update((f) => ({ ...f, status, page: 1 }));
    this.clearCache();
    this.fetchAuthors(false);
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchAuthors();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchAuthors();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchAuthors();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.fetchAuthors();
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

  fetchTitlesByAuthor(authorId: number) {
    if (this.authorTitles()[authorId]) return;

    console.log(authorId, 'authorssiidd');

    this.titleService
      .getTitles({ authorIds: +authorId })
      .then(async ({ items }) => {
        this.authorTitles.update((prev) => ({
          ...prev,
          [authorId]: items,
        }));
        const publisherIds = Array.from(
          new Set(items.map((t) => t.publisherId).filter((id) => !!id))
        );
        await Promise.all(
          publisherIds.map(async (id) => {
            if (!this.publishers()[id]) {
              try {
                const publisher = await this.publisherService.getPublisherById(
                  id
                );
                this.publishers.update((prev) => ({
                  ...prev,
                  [id]: publisher,
                }));
              } catch (err) {
                console.error(`Error fetching publisher ${id}:`, err);
              }
            }
          })
        );
      })
      .catch((err) => {
        console.error('Error fetching titles:', err);
        this.authorTitles.update((prev) => ({
          ...prev,
          [authorId]: [],
        }));
      });
  }

  fetchEarningsByAuthor(authorId: number) {
    if (this.authorBooksSold()[authorId]) return;
    console.log(authorId, 'authorssiidd');
    this.salesService
      .fetchEarnings({ authorIds: +authorId })
      .then(({ items }) => {
        this.authorBooksSold.update((prev) => ({
          ...prev,
          [authorId]: items,
        }));
      })
      .catch((err) => {
        console.error('Error fetching titles:', err);
        this.authorBooksSold.update((prev) => ({
          ...prev,
          [authorId]: [],
        }));
      });
  }
  authorDBStatus = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.AuthorStatus || {}
    );
  });

  ngOnInit(): void {
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
      this.fetchAuthors(false);
    });
    this.fetchAuthors();
  }

  inviteAuthor(): void {
    const dialogRef = this.dialog.open(InviteDialog, {
      data: {
        onSave: async (email: string) => {
          const response = await this.authorService.sendInviteLink(email);
          if (response) {
            dialogRef.close();
            Swal.fire({
              title: 'success',
              html: response.message,
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

  approveAuthor(authorId: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Once approve, you will not be able to reject this account!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Approve it!',
      cancelButtonText: 'Cancel',
      heightAuto: false,
      customClass: {
        cancelButton: '!bg-accent',
        confirmButton: '!bg-primary',
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await this.authorService.updateAuthorStatus(
          { status: AuthorStatus.Active },
          authorId
        );
        if (response) {
          const updatedData = this.dataSource.data.map((item) =>
            item.id === authorId
              ? { ...item, status: AuthorStatus.Active }
              : item
          );
          this.dataSource.data = updatedData;
          Swal.fire({
            text: 'The author has been approved!',
            icon: 'success',
            title: 'success',
            heightAuto: false,
          });
        }
      }
    });
  }

  rejectAuthor(authorId: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Once rejected, you will not be able to recover this account!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject it!',
      cancelButtonText: 'Cancel',
      heightAuto: false,
      customClass: {
        confirmButton: '!bg-accent',
        cancelButton: '!bg-primary',
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await this.authorService.updateAuthorStatus(
          { status: AuthorStatus.Rejected },
          authorId
        );
        if (response) {
          const updatedData = this.dataSource.data.map((item) =>
            item.id === authorId
              ? { ...item, status: AuthorStatus.Rejected }
              : item
          );
          this.dataSource.data = updatedData;
          Swal.fire({
            text: 'The author has been rejected!',
            icon: 'success',
            title: 'success',
            heightAuto: false,
          });
        }
      }
    });
  }

  async updateStatus(authorId: number, status: 'Active' | 'Deactivated') {
    const isDeactivating = status === 'Deactivated';

    const title = isDeactivating ? 'Deactivate Author?' : 'Activate Author?';
    const html = isDeactivating
      ? `
      <p>Once deactivated, this author will no longer be accessible.</p>
      <div class="flex items-center justify-center mt-4">
        <input type="checkbox" id="delistCheckbox" />
        <label for="delistCheckbox" class="ml-2">Also delist all titles</label>
      </div>
    `
      : 'This author account will be activated and made accessible again.';

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

    if (!result.isConfirmed) return;

    try {
      await this.authorService.updateAuthorStatus(
        { status: status as any, delinkTitle: result.value['delist'] },
        authorId
      );

      Swal.fire({
        title: 'Success',
        text: isDeactivating
          ? 'The author has been deactivated successfully.'
          : 'The author has been activated successfully.',
        icon: 'success',
        heightAuto: false,
      });

      this.dataSource.data = this.dataSource.data.map((item) =>
        item.id === authorId ? { ...item, status } : item
      );
    } catch (error) {
      console.log(error);
    }
  }

  onClickChangePassword(author: Author) {
    const dialog = this.dialog.open(ChangePassword, {
      data: {
        onClose: () => dialog.close(),
        onSubmit: async (password: string) => {
          console.log({ password });
          await this.authService.changeAuthorPublisherPassword(
            author.user.id,
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
      const authors = this.authors();
      if (!authors || authors.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning') || 'Warning',
          text:
            this.translateService.instant('nodatatoexport') ||
            'No data to export',
        });
        return;
      }

      const exportColumns = this.displayedColumns.filter(
        (col) => col !== 'actions'
      );

      const exportData = authors.map((author) => {
        const dataRow: Record<string, any> = {};

        exportColumns.forEach((col) => {
          switch (col) {
            case 'name':
              dataRow[col] =
                author.user.firstName + ' ' + author.user.lastName;
              break;
            case 'numberoftitles':
              dataRow[col] = author.noOfTitles || 0;
              break;
            case 'bookssold':
              dataRow[col] = author.booksSold || 0;
              break;
            case 'royaltiesearned':
              dataRow[col] = Number(author.totalEarning || 0).toFixed(2);
              break;
            case 'status':
              dataRow[col] = author.status || '-';
              break;
            default:
              dataRow[col] = (author as any)[col] || '-';
          }
        });

        return dataRow;
      });

      const headers: Record<string, string> = {
        name: this.translateService.instant('name') || 'Name',
        numberoftitles:
          this.translateService.instant('numberoftitles') ||
          'Number of Titles',
        bookssold:
          this.translateService.instant('bookssold') || 'Books Sold',
        royaltiesearned:
          this.translateService.instant('royaltiesearned') ||
          'Royalties Earned',
        status: this.translateService.instant('status') || 'Status',
      };

      const currentPage = this.filter().page || 1;
      const fileName = `authors-page-${currentPage}-${format(
        new Date(),
        'dd-MM-yyyy'
      )}`;

      exportToExcel(exportData, fileName, headers, 'Authors');

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
