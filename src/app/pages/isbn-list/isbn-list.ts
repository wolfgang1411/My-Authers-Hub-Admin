import { Component, computed, OnInit, Signal, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTableDataSource } from '@angular/material/table';
import { IsbnService } from '../../services/isbn-service';
import {
  catchError,
  debounceTime,
  map,
  of,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import {
  Author,
  AuthorStatus,
  createIsbn,
  ISBN,
  ISBNFilter,
  ISBNStatus,
  Publishers,
  PublisherStatus,
  User,
} from '../../interfaces';
import { Logger } from '../../services/logger';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateIsbn } from '../../components/create-isbn/create-isbn';
import Swal from 'sweetalert2';
import { downloadFile, urlToFile } from '../../common/utils/file';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { StaticValuesService } from '../../services/static-values';
import { UserService } from '../../services/user';
import { AssignIsbn } from 'src/app/components/assign-isbn/assign-isbn';
import { cleanIsbn, formatIsbn } from 'src/app/shared/utils/isbn.utils';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IsbnFormatPipe } from 'src/app/pipes/isbn-format-pipe';

@Component({
  selector: 'app-isbn-list',
  imports: [
    SharedModule,
    ListTable,
    AngularSvgIconModule,
    RouterModule,
    MatButton,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconButton,
    ReactiveFormsModule,
    IsbnFormatPipe,
  ],
  templateUrl: './isbn-list.html',
  styleUrl: './isbn-list.css',
})
export class ISBNList implements OnInit {
  constructor(
    private isbnService: IsbnService,
    private logger: Logger,
    private dialog: MatDialog,
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private staticValService: StaticValuesService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loggedInUser$ = this.userService.loggedInUser$;
  }

  loggedInUser$!: Signal<User | null>;

  // Base columns used for all statuses except APPLIED
  displayedColumnsBase = [
    'titlename',
    'authorname',
    'publishername',
    'verso',
    'language',
    'status',
    'isbnnumber',
    'actions',
  ];

  displayedColumns = [...this.displayedColumnsBase];

  filter: ISBNFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
    status: ISBNStatus.PENDING,
    orderBy: 'id',
    orderByVal: 'desc',
  };

  isbnStatuses = computed(() => {
    return Object.keys(
      this.staticValService.staticValues()?.ISBNStatus || {}
    ).filter((v) => v !== 'DELETED');
  });

  lastSelectedStatus: ISBNStatus | 'ALL' = ISBNStatus.PENDING;
  isbnStatusEnum = ISBNStatus;

  dataSource = new MatTableDataSource<any>();
  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(800))
    .subscribe((value) => {
      this.filter.searchStr = value;
      this.filter.page = 1;
      this.fetchIsbnList();
    });

  lastPage = signal(1);
  isbnList = signal<ISBN[]>([]);
  publisherList = signal<Publishers[] | null>(null);
  authorsList = signal<Author[] | null>(null);
  isbnInputs = new Map<number, FormControl<string | null>>();

  // Single form used for inline ISBN entry (APPLIED tab)
  createIsbnForm = new FormGroup({
    isbnNumber: new FormControl<string | null>(null, {
      asyncValidators: this.validateIsbn(),
    }),
  });

  ngOnInit(): void {
    // Fetch authors and publishers list (always needed)
    this.fetchAndUpdateAuthorsList();
    this.fetchAndUpdatePublishersList();

    // Read status from query params
    this.route.queryParams.subscribe((params) => {
      const statusParam = params['status'];
      if (statusParam) {
        // Validate the status is a valid ISBNStatus or 'ALL'
        if (
          statusParam === 'ALL' ||
          Object.values(ISBNStatus).includes(statusParam as ISBNStatus)
        ) {
          const status =
            statusParam === 'ALL' ? 'ALL' : (statusParam as ISBNStatus);
          // Only update if different from current to avoid infinite loop
          if (this.lastSelectedStatus !== status) {
            this.selectStatus(status, false); // false = don't update query params (already set)
          }
        } else {
          // Invalid status in query params, use default and fetch
          this.fetchIsbnList();
        }
      } else {
        // No status in query params, use default and fetch
        this.fetchIsbnList();
      }
    });
  }

  // Async validator for ISBN
  validateIsbn(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const rawValue = control.value || '';
      // Always clean the value to handle both formatted (with hyphens) and raw input
      const isbn = cleanIsbn(String(rawValue));

      if (isbn.length === 0) return of(null);

      // allow typing until it reaches 13
      if (isbn.length < 13) return of(null);
      if (isbn.length !== 13) return of({ invalid: 'ISBN must be 13 digits' });

      // Validate ISBN-13 format locally (check digit validation)
      if (!/^\d{13}$/.test(isbn)) {
        return of({ invalid: 'ISBN must contain only digits' });
      }

      // Validate check digit for ISBN-13
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(isbn[i]);
        if (isNaN(digit)) {
          return of({ invalid: 'ISBN must contain only digits' });
        }
        sum += digit * (i % 2 === 0 ? 1 : 3);
      }
      let check = (10 - (sum % 10)) % 10;
      const lastDigit = parseInt(isbn[12]);
      if (isNaN(lastDigit) || check !== lastDigit) {
        return of({ invalid: 'Invalid ISBN check digit' });
      }

      // Format is valid, allow it
      return of(null);
    };
  }

  selectStatus(status: ISBNStatus | 'ALL', updateQueryParams: boolean = true) {
    this.lastSelectedStatus = status;

    this.displayedColumns = [...this.displayedColumnsBase];

    const isAppliedTab = status === ISBNStatus.APPLIED;
    const isAllTab = status === 'ALL';

    this.filter.status = status === 'ALL' ? undefined : status;
    this.filter.page = 1;

    // Update query params to persist the selected tab
    if (updateQueryParams) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { status: status === 'ALL' ? 'ALL' : status },
        queryParamsHandling: 'merge', // Preserve other query params if any
      });
    }

    this.fetchIsbnList();
  }

  getIsbnControl(id: number) {
    if (!this.isbnInputs.has(id)) {
      const control = new FormControl<string | null>(null, {
        asyncValidators: this.validateIsbn(),
        updateOn: 'change',
      });

      control.valueChanges.subscribe((value) => {
        if (!value) return;
        const cleaned = cleanIsbn(value);
        const formatted = formatIsbn(cleaned);
        if (formatted !== value) {
          control.setValue(formatted, { emitEvent: false });
        }
      });

      this.isbnInputs.set(id, control);
    }
    return this.isbnInputs.get(id)!;
  }

  async fetchAndUpdatePublishersList() {
    const { items } = await this.publisherService.getPublishers({
      status: PublisherStatus.Active,
      itemsPerPage: 1000,
    });
    this.publisherList.set(items);
  }

  async fetchAndUpdateAuthorsList() {
    const { items } = await this.authorService.getAuthors({
      itemsPerPage: 1000,
      status: AuthorStatus.Active,
    });
    this.authorsList.set(items);
  }

  async createIsbn(isbn?: ISBN) {
    const dialogRef = this.dialog.open(CreateIsbn, {
      maxWidth: '90vw',
      data: {
        isbn,
        authorsList: this.authorsList(),
        publishersList: this.publisherList(),
        onSubmit: async (createIsbn: createIsbn) => {
          const response = await this.isbnService.createOrUpdateIsbn({
            ...createIsbn,
            id: isbn?.id,
          });
          this.isbnList.update((list) => {
            if (isbn) {
              list = list.map((item) =>
                item.id === response.id ? response : item
              );
            } else {
              list.unshift(response);
            }
            return list;
          });
          this.updateISBNList();
          if (response) {
            dialogRef.close();
            Swal.fire({
              title: 'success',
              html: 'The ISBN has been applied',
              icon: 'success',
              heightAuto: false,
            });
          }
        },
        onClose: () => {
          dialogRef.close();
        },
      },
    });
  }

  async onISBNStatusChange(id: number, status: string) {
    let html = '';
    let title = 'Are you sure?';

    if (status === 'APPLIED') {
      html = 'The ISBN will be applied.';
    } else if (status === 'REJECTED') {
      html =
        'The ISBN will be rejected. <br> once rejected it cannot be changed.';
    }

    const { value } = await Swal.fire({
      icon: 'warning',
      title,
      html,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      heightAuto: false,
      customClass: {
        confirmButton: status === 'APPROVED' ? '!bg-primary' : '!bg-red-500',
      },
    });

    if (!value) return;

    const response = await this.isbnService.createOrUpdateIsbn({
      id,
      status,
    } as any);

    // Update local list
    this.isbnList.update((list) =>
      list.map((item) => (item.id === response.id ? response : item))
    );

    this.updateISBNList();

    // ⭐ Redirect to APPLIED tab if status is APPLIED
    if (status === 'APPLIED') {
      this.selectStatus(ISBNStatus.APPLIED);
    }
  }

  async saveInlineISBN(element: any) {
    // Use the control from createIsbnForm since that's what the template uses
    const control = this.createIsbnForm.controls.isbnNumber;
    const isbnNumber = cleanIsbn(control.value || '');

    if (!isbnNumber || isbnNumber.length !== 13) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid ISBN',
        text: 'Please enter a valid 13-digit ISBN number.',
      });
      return;
    }

    // Additional validation: check digit
    if (!/^\d{13}$/.test(isbnNumber)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid ISBN',
        text: 'ISBN must contain only digits.',
      });
      return;
    }

    // Validate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbnNumber[i]);
      if (isNaN(digit)) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid ISBN',
          text: 'ISBN must contain only digits.',
        });
        return;
      }
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    let check = (10 - (sum % 10)) % 10;
    const lastDigit = parseInt(isbnNumber[12]);
    if (isNaN(lastDigit) || check !== lastDigit) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid ISBN',
        text: 'Invalid ISBN check digit. Please verify the ISBN number.',
      });
      return;
    }

    // Check if control is still pending (async validation in progress)
    if (control.pending) {
      Swal.fire({
        icon: 'info',
        title: 'Validating...',
        text: 'Please wait while the ISBN is being validated.',
      });
      return;
    }

    // For APPLIED status, only send id, isbnNumber, and status (APPROVED)
    // Don't send all the other fields
    const payload: createIsbn = {
      id: element.id,
      isbnNumber,
      status: ISBNStatus.APPROVED,
    } as any;

    const response = await this.isbnService.createOrUpdateIsbn(payload);

    Swal.fire({
      icon: 'success',
      title: 'Assigned',
      text: 'ISBN has been approved successfully!',
    });

    this.isbnList.update((list) =>
      list.map((item) => (item.id === response.id ? response : item))
    );

    this.updateISBNList();

    // Redirect to APPROVED tab after approval
    this.selectStatus(ISBNStatus.APPROVED);
    control.reset();
  }

  async assignISBN(isbn: ISBN) {
    const dialogRef = this.dialog.open(AssignIsbn, {
      maxWidth: '90vw',
      data: {
        isbn,
        authorsList: this.authorsList(),
        publishersList: this.publisherList(),
        onSubmit: async (createIsbn: createIsbn) => {
          const response = await this.isbnService.createOrUpdateIsbn({
            ...createIsbn,
            id: isbn.id,
          });
          this.isbnList.update((list) => {
            if (isbn) {
              list = list.map((item) =>
                item.id === response.id ? response : item
              );
            } else {
              list.unshift(response);
            }
            return list;
          });
          this.updateISBNList();
          if (response) {
            dialogRef.close();
            Swal.fire({
              title: 'success',
              html: 'The ISBN has been generated',
              icon: 'success',
              heightAuto: false,
            });
          }
        },
        onClose: () => {
          dialogRef.close();
        },
      },
    });
  }

  fetchIsbnList() {
    const filter = { ...this.filter };
    if (filter.status === undefined || filter.status === null) {
      delete filter.status;
    }

    this.isbnService.getAllISBN(filter).then((response) => {
      this.isbnList.set(response.items);
      this.lastPage.set(
        Math.ceil(response.totalCount / this.filter.itemsPerPage)
      );
      this.updateISBNList();
    });
  }

  nextPage() {
    if (this.filter.page < this.lastPage()) {
      this.filter.page = this.filter.page + 1;
      this.fetchIsbnList();
    }
  }

  previousPage() {
    if (this.filter.page > 1) {
      this.filter.page = this.filter.page - 1;
      this.fetchIsbnList();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.page = pageNumber;
      this.fetchIsbnList();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.itemsPerPage = itemsPerPage;
    this.filter.page = 1;
    this.fetchIsbnList();
  }

  getPageNumbers(): number[] {
    const currentPage = this.filter.page || 1;
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

  // 🔹 Map backend ISBN into table row shape
  updateISBNList() {
    const isbnList = this.isbnList();
    this.dataSource.data = isbnList.map((isbn) => ({
      ...isbn, // keep original fields for payload
      id: isbn.id,
      isbntype: isbn.type,
      titlename: isbn.titleName,
      authorname: isbn.authors
        .map(({ user: { fullName } }) => fullName)
        .join(', '),
      publishername: isbn.publisher?.name,
      verso: isbn.edition,
      language: isbn.language,
      isbnnumber: formatIsbn(isbn.isbnNumber) ?? 'N/A',
      status: isbn.status,
      createdby: isbn.admin
        ? isbn.admin.firstName + ' ' + isbn.admin.lastName
        : 'N/A',
    }));
  }

  downloadBarCode(isbnNumber: string) {
    this.isbnService.downloadBarCode(isbnNumber).then((response: any) => {
      downloadFile(response.body, 'filename');
    });
  }

  async downloadBunko(isbn: ISBN) {
    const filename = `bunko-${isbn.id}.png`;
    const file = await urlToFile(isbn.bunko, filename);
    downloadFile(file, filename);
  }

  // Map display columns to API sort fields
  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      titlename: 'titleName',
      authorname: 'id', // Authors is a relation, sort by id for now
      publishername: 'publisherId', // Publisher is a relation, sort by publisherId
      verso: 'edition',
      language: 'language',
      status: 'status',
      isbnnumber: 'isbnNumber',
      // Direct fields that can be sorted
      id: 'id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      titleName: 'titleName',
      edition: 'edition',
      isbnNumber: 'isbnNumber',
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

    this.filter.orderBy = apiFieldName;
    this.filter.orderByVal = direction;
    this.filter.page = 1;

    this.fetchIsbnList();
  }
}
