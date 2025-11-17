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
import { MatIcon, MatIconModule } from '@angular/material/icon';
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
    private staticValueService: StaticValuesService
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  loggedInUser!: Signal<User | null>;

  titleDBStatus = computed(() => {
    console.log(this.staticValueService.staticValues(), 'Fdafsaf');

    return Object.keys(
      this.staticValueService.staticValues()?.PuplisherStatus || {}
    );
  });
  searchStr = new Subject<string>();

  test!: Subject<string>;
  titles = signal<Title[]>([]);
  displayedColumns: string[] = [
    'name',
    'bookssold',
    'authors',
    'isbn',
    'launchdate',
    'status',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>();
  filter: TitleFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
  };
  fetchTitleDetails() {
    this.titleService
      .getTitles()
      .then(({ items }) => {
        this.titles.set(items);
        this.mapDataList();

        console.log('Fetched titles:', this.titles());
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }
  mapDataList() {
    const mapped = this.titles().map((title, idx) => ({
      ...title,
      isbn: `${title.isbnPrint || 'N/A'}<br>${title.isbnEbook || ''}`,
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
      launchdate: title.submission_date
        ? format(title.submission_date, 'dd-MM-yyyy')
        : 'N/A',
      actions: '',
    }));

    this.dataSource.data = mapped;
  }

  ngOnInit(): void {
    this.fetchTitleDetails();
    this.searchStr.pipe(debounceTime(400)).subscribe((value) => {
      this.filter.page = 1;
      this.filter.searchStr = value;
      if (!value?.length) {
        delete this.filter.searchStr;
      }
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
      maxWidth: '90vw',
      data: {
        onClose: () => dialog.close(),
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
}
