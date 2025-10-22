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
    private staticValueService: StaticValuesService
  ) {}
  searchStr = new Subject<string>();

  test!: Subject<string>;
  authors = signal<Author[]>([]);
  displayedColumns: string[] = [
    'serial',
    'name',
    'username',
    'emailid',
    'phonenumber',
    'numberoftitles',
    'royaltiesearned',
    'status',
    'actions',
  ];
  dataSource = new MatTableDataSource<AuthorResponse>();
  AuthorStatus = AuthorStatus;

  filter: AuthorFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
  };

  fetchAuthors(showLoader = true) {
    this.authorService
      .getAuthors(this.filter, showLoader)
      .then(({ items }) => {
        this.authors.set(items);
        const mapped = items.map((author, idx) => ({
          id: author.id,
          serial: idx + 1,
          name: author.user.firstName + ' ' + author.user.lastName,
          username: author.username,
          emailid: author.user.email,
          phonenumber: author.user.phoneNumber,
          numberoftitles: author.titles ? author.titles.length : 0,
          royaltiesearned: 0,
          // royaltiesearned:
          //   author.Royalty && author.Royalty.length
          //     ? author.Royalty.reduce((acc, royalty) => {
          //         const sumForOne =
          //           (royalty.print_mah || 0) +
          //           (royalty.print_third_party || 0) +
          //           (royalty.prime || 0) +
          //           (royalty.ebook_mah || 0) +
          //           (royalty.ebook_third_party || 0);
          //         return acc + sumForOne;
          //       }, 0)
          //     : 0,
          actions: '',
        }));
        const exisitingData = this.dataSource.data;
        this.dataSource.data =
          exisitingData && exisitingData.length && (this.filter.page || 0) > 1
            ? [...exisitingData, ...mapped]
            : mapped;

        this.dataSource.data = mapped;
        if (mapped.length > 0) {
          const filtrCol = { ...mapped[0] };
          delete (filtrCol as any).id;
          if (!exisitingData || !exisitingData.length) {
            this.displayedColumns = Object.keys(filtrCol);
          }
        }
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

  updateStatus(authorId: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Once Deactivated, you will not be able to recover this account!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, deactivate it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      heightAuto: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await this.authorService.updateAuthorStatus(
          AuthorStatus.Deactivated,
          authorId
        );
        if (response) {
          const updatedData = this.dataSource.data.map((item) =>
            item.id === authorId
              ? { ...item, status: AuthorStatus.Deactivated }
              : item
          );
          this.dataSource.data = updatedData;
          Swal.fire({
            text: 'The Author has been Deactivated!',
            icon: 'success',
            title: 'success',
            heightAuto: false,
          });
        }
      }
    });
  }
}
