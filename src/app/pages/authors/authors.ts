import {
  Component,
  computed,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { AuthorsService } from './authors-service';
import { debounceTime, Subject } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import { Author, AuthorFilter, AuthorStatus } from '../../interfaces';
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
    private salesService: SalesService
  ) {}
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
  filter: AuthorFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
    showTotalEarnings: true,
  };
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
    this.authorService
      .getAuthors(this.filter, showLoader)
      .then(({ items }) => {
        this.authors.set(items);
        const mapped = items.map((author, idx) => ({
          ...author,
          name: author.user.firstName + ' ' + author.user.lastName,
          numberoftitles: author.noOfTitles,
          bookssold: author.booksSold,
          royaltiesearned: author.totalEarning || 0,
          actions: '',
        }));
        const exisitingData = this.dataSource.data;
        this.dataSource.data =
          exisitingData && exisitingData.length && (this.filter.page || 0) > 1
            ? [...exisitingData, ...mapped]
            : mapped;

        this.dataSource.data = mapped;
        console.log('Fetched publishers:', this.authors());
      })
      .catch((error) => {
        console.error('Error fetching publishers:', error);
      });
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
      this.filter.page = 1;
      this.filter.searchStr = value;
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
}
