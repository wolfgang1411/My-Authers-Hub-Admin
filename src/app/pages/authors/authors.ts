import { Component, computed, signal } from '@angular/core';
import { AuthorsService } from './authors-service';
import { debounceTime, Subject } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  Author,
  AuthorFilter,
  AuthorResponse,
  AuthorStatus,
} from '../../interfaces';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../../components/list-table/list-table';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatIconButton } from '@angular/material/button';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';
import { Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Invite } from '../../interfaces/Invite';
import Swal from 'sweetalert2';
import { PublisherService } from '../publisher/publisher-service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { ChangePassword } from '../../components/change-password/change-password';
import { AuthService } from '../../services/auth';
import { TranslateService } from '@ngx-translate/core';

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
    private translateService: TranslateService
  ) {}
  searchStr = new Subject<string>();

  test!: Subject<string>;
  authors = signal<Author[]>([]);
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

  filter: AuthorFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
    showTotalEarnings: true,
  };

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
          const inviteData = {
            email: email,
            type: 'AUTHER',
          };
          const response = await this.publisherService.sendInviteLink(
            inviteData as Invite
          );
          if (response) {
            dialogRef.close();
            Swal.fire({
              title: 'success',
              html: (response as any).message,
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
      reverseButtons: true,
      heightAuto: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await this.authorService.approveAuthor(authorId);
        if (response) {
          const updatedData = this.dataSource.data.map((item) =>
            item.id === authorId
              ? { ...item, status: AuthorStatus.Active }
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

  rejectAuthor(authorId: number) {
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
        const response = await this.authorService.rejectAuthor(authorId);
        if (response) {
          const updatedData = this.dataSource.data.map((item) =>
            item.id === authorId
              ? { ...item, status: AuthorStatus.Rejected }
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
