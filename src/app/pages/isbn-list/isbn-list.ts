import { Component, computed, Signal, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTableDataSource } from '@angular/material/table';
import { IsbnService } from '../../services/isbn-service';
import { debounceTime, Subject } from 'rxjs';
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
import {
  downloadFile,
  getFileToBase64,
  urlToFile,
} from '../../common/utils/file';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';
import { MatOption, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { StaticValuesService } from '../../services/static-values';
import { UserService } from '../../services/user';
import { stat } from 'fs';
import { AssignIsbn } from 'src/app/components/assign-isbn/assign-isbn';
import { formatIsbn } from 'src/app/shared/utils/isbn.utils';

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
  ],
  templateUrl: './isbn-list.html',
  styleUrl: './isbn-list.css',
})
export class ISBNList {
  constructor(
    private isbnService: IsbnService,
    private logger: Logger,
    private dialog: MatDialog,
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private staticValService: StaticValuesService,
    private userService: UserService
  ) {
    this.loggedInUser$ = this.userService.loggedInUser$;
  }

  loggedInUser$!: Signal<User | null>;

  displayedColumns: string[] = [
    'titlename',
    'authorname',
    'publishername',
    'verso',
    'language',
    'status',
    'isbnnumber',
    'actions',
  ];
  filter: ISBNFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
    status: 0 as any,
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
  ngOnInit(): void {
    this.fetchIsbnList();
    this.fetchAndUpdateAuthorsList();
    this.fetchAndUpdatePublishersList();
  }
  selectStatus(status: ISBNStatus | 'ALL') {
    this.lastSelectedStatus = status;
    if (status === 'ALL') {
      this.filter = {
        ...this.filter,
        status: undefined,
      };
    } else {
      this.filter = {
        ...this.filter,
        page: 1,
        status: status as ISBNStatus,
      };
    }
    this.fetchIsbnList();
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

  publisherList = signal<Publishers[] | null>(null);
  authorsList = signal<Author[] | null>(null);

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
            let html = 'The ISBN has been applied';
            Swal.fire({
              title: 'success',
              html,
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
    let title = '';

    if (status === 'APPROVED') {
      html =
        'The ISBN will be approved. <br> once approved it cannot be changed.';
      title = 'Are you sure?';
    } else if (status === 'REJECTED') {
      html =
        'The ISBN will be rejected. <br> once rejected it cannot be changed.';
      title = 'Are you sure?';
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

    this.isbnList.update((list) => {
      return list.map((item) => (item.id === response.id ? response : item));
    });
    this.updateISBNList();
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
            let html = 'The ISBN has been generated';
            Swal.fire({
              title: 'success',
              html,
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
    console.log(filter);

    if (!filter.status) {
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

  updateISBNList() {
    const isbnList = this.isbnList();

    this.dataSource.data = isbnList.map((isbn, index) => {
      return {
        ...isbn,
        id: isbn.id,
        isbnnumber: formatIsbn(isbn.isbnNumber),
        isbntype: isbn.type,
        titlename: isbn.titleName,
        authorname: isbn.authors
          .map(({ user: { fullName } }) => fullName)
          .join(','),
        publishername: isbn.publisher.name,
        verso: isbn.edition,
        language: isbn.language,
        status: isbn.status,
        createdby: isbn.admin
          ? isbn.admin.firstName + ' ' + isbn.admin.lastName
          : 'N/A',
      };
    });
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
}
