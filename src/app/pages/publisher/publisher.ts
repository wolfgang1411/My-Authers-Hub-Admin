import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { debounceTime, Subject } from 'rxjs';
import { PublisherResponse, Publishers } from '../../interfaces/Publishers';
import { PublisherService } from './publisher-service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';
import { Validators } from '@angular/forms';
import { Invite, InviteType } from '../../interfaces/Invite';
import Swal from 'sweetalert2';

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
  ],
  templateUrl: './publisher.html',
  styleUrl: './publisher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Publisher implements OnInit {
  constructor(
    private publisherService: PublisherService,
    private dialog: MatDialog
  ) {}
  searchStr = new Subject<string>();

  test!: Subject<string>;
  publishers = signal<Publishers[]>([]);
  dataSource = new MatTableDataSource<PublisherResponse>();

  displayedColumns: string[] = [
    'serial',
    'name',
    'email',
    'phonenumber',
    'titles',
    'authors',
    'companyname',
    'actions',
  ];
  ngOnInit(): void {
    this.searchStr.pipe(debounceTime(400)).subscribe((value) => {
      console.log('Search string:', value);
    });

    this.publisherService
      .getPublishers()
      .then(({ items }) => {
        this.publishers.set(items);
        const mapped = items.map((publisher, idx) => ({
          id: publisher.id,
          serial: idx + 1,
          name: publisher.user
            ? publisher.user.firstName + ' ' + publisher.user.lastName
            : '',
          email: publisher.email,
          phonenumber: publisher.phoneNumber,
          titles:
            publisher.titles && publisher.titles.length
              ? publisher.titles.length
              : 0,
          authors:
            publisher.authors && publisher.authors.length
              ? publisher.authors.length
              : 0,
          companyname: publisher.name,
          actions: '',
        }));

        this.dataSource.data = mapped;
        this.displayedColumns = Object.keys(mapped[0]);

        console.log('Mapped publishers:', mapped);
      })
      .catch((error) => {
        console.error('Error fetching publishers:', error);
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
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
}
