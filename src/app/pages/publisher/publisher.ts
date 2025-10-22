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
import { MatButton, MatButtonModule } from '@angular/material/button';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';
import { Validators } from '@angular/forms';
import { Invite } from '../../interfaces/Invite';
import Swal from 'sweetalert2';
import { DistributionDialog } from '../../components/distribution-dialog/distribution-dialog';
import { Distribution } from '../../interfaces/Distribution';
import { PublisherStatus } from '../../interfaces';

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
  PublisherStatus = PublisherStatus;
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
          status: publisher.status,
          actions: '',
        }));

        this.dataSource.data = mapped;
        if (mapped.length > 0) {
          const filtrCol = { ...mapped[0] };
          delete (filtrCol as any).id;
          this.displayedColumns = Object.keys(filtrCol);
        }

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

  openDistributionDialog(publisherId: number) {
    const dialogRef = this.dialog.open(DistributionDialog, {
      data: {
        onSubmit: async (distributionData: Distribution[]) => {
          console.log(distributionData, 'distrubittton dta');
          const response = await this.publisherService.approvePublisher(
            distributionData,
            publisherId
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
  updateStatus(publisherId: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Once Deactivated, you will not be able to recover this account!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reject it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      heightAuto: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await this.publisherService.updatePublisherStatus(
          PublisherStatus.Deactivated,
          publisherId
        );
        if (response) {
          const updatedData = this.dataSource.data.map((item) =>
            item.id === publisherId
              ? { ...item, status: PublisherStatus.Deactivated }
              : item
          );
          this.dataSource.data = updatedData;
          Swal.fire({
            text: 'The publisher has been Deactivated!',
            icon: 'success',
            title: 'success',
            heightAuto: false,
          });
        }
      }
    });
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
