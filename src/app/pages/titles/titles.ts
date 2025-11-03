import { Component, signal } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import {
  ApproveTitlePayload,
  CreateDistributionLink,
  CreatePlatformIdentifier,
  Title,
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
import { TitleStatus } from '../../interfaces';
import { ApproveTitle } from '../../components/approve-title/approve-title';

@Component({
  selector: 'app-titles',
  imports: [
    SharedModule,
    RouterLink,
    ListTable,
    MatIconModule,
    MatIconButton,
    MatButton,
  ],
  templateUrl: './titles.html',
  styleUrl: './titles.css',
})
export class Titles {
  constructor(
    private titleService: TitleService,
    private translateService: TranslateService,
    private matDialog: MatDialog
  ) {}
  searchStr = new Subject<string>();

  test!: Subject<string>;
  titles = signal<Title[]>([]);
  displayedColumns: string[] = [
    'name',
    'bookssold',
    'authors',
    'isbn',
    'launchdate',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>();

  ngOnInit(): void {
    this.searchStr.pipe(debounceTime(400)).subscribe((value) => {
      console.log('Search string:', value);
    });

    this.titleService
      .getTitles()
      .then(({ items }) => {
        this.titles.set(items);
        const mapped = items.map((title, idx) => ({
          ...title,
          isbn: `${title.isbnPrint || ''}<br>${title.isbnEbook || ''}`,
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
            : null,
          actions: '',
        }));

        this.dataSource.data = mapped;

        console.log('Fetched titles:', this.titles());
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }

  onClickApprove(title: Title) {
    if (!title.distribution || !title.distribution.length) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: this.translateService.instant('titledistributionsnotfound'),
      });
      return;
    }

    const dialog = this.matDialog.open(ApproveTitle, {
      data: {
        distribution: title.distribution,
        onClose: () => dialog.close(),
        onSubmit: async (data: {
          distributionLinks: CreateDistributionLink[];
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
