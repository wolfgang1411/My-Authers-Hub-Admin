import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { debounceTime, Subject } from 'rxjs';
import {
  PublisherFilter,
  PublisherResponse,
  Publishers,
} from '../../interfaces/Publishers';
import { PublisherService } from './publisher-service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';
import { Validators } from '@angular/forms';
import { Invite } from '../../interfaces/Invite';
import Swal from 'sweetalert2';
import { DistributionDialog } from '../../components/distribution-dialog/distribution-dialog';
import { Distribution } from '../../interfaces/Distribution';
import { PublisherStatus, User } from '../../interfaces';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { ChangePassword } from '../../components/change-password/change-password';
import { UserService } from '../../services/user';
import { AuthService } from '../../services/auth';
import { TranslateService } from '@ngx-translate/core';

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
    MatSelectModule,
  ],
  templateUrl: './publisher.html',
  styleUrl: './publisher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Publisher implements OnInit {
  constructor(
    private publisherService: PublisherService,
    private dialog: MatDialog,
    private staticValueService: StaticValuesService,
    private userService: UserService,
    private authService: AuthService,
    private translateService: TranslateService,
    private router: Router
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  loggedInUser!: Signal<User | null>;

  publisherDBStatus = computed(() => {
    console.log(this.staticValueService.staticValues(), 'Fdafsaf');

    return Object.keys(
      this.staticValueService.staticValues()?.PuplisherStatus || {}
    );
  });

  searchStr = new Subject<string>();
  PublisherStatus = PublisherStatus;
  test!: Subject<string>;
  publishers = signal<Publishers[]>([]);
  dataSource = new MatTableDataSource<any>();

  displayedColumns: string[] = [
    'name',
    'nooftitles',
    'noofauthors',
    'email',
    'phonenumber',
    'actions',
  ];

  filter: PublisherFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
  };
  fetchPublishers(showLoader = true) {
    this.publisherService
      .getPublishers(this.filter, showLoader)
      .then(({ items }) => {
        items = items.filter(
          ({ user: { id } }) => id !== this.userService.loggedInUser$()?.id
        );

        this.publishers.set(items);

        const mapped = items.map((publisher) => ({
          ...publisher,
          phonenumber: publisher.phoneNumber || publisher.user.phoneNumber,
          nooftitles: publisher.noOfTitles,
          noofauthors: publisher.noOfAuthors,
          actions: '',
        }));

        const existingData = this.dataSource.data;
        this.dataSource.data =
          existingData && existingData.length && (this.filter.page || 0) > 2
            ? [...existingData, ...mapped]
            : mapped;
        if (mapped.length > 0) {
          const filtrCol = { ...mapped[0] };
          delete (filtrCol as any).id;
          if (!existingData) this.displayedColumns = Object.keys(filtrCol);
        }

        console.log('Mapped publishers:', mapped);
      })
      .catch((error) => {
        console.error('Error fetching publishers:', error);
      });
  }

  ngOnInit(): void {
    this.fetchPublishers();
    this.searchStr.pipe(debounceTime(400)).subscribe((value) => {
      this.filter.page = 1;
      this.filter.searchStr = value;
      if (!value?.length) {
        delete this.filter.searchStr;
      }
      this.fetchPublishers(false);
    });
  }
  openDistributionDialog(publisherId: number) {
    const dialogRef = this.dialog.open(DistributionDialog, {
      data: {
        onSubmit: async (
          distributionData: Distribution[],
          allowCustomPrintingPrice?: boolean
        ) => {
          console.log(distributionData, 'distrubittton dta');
          const response = await this.publisherService.approvePublisher(
            distributionData,
            publisherId,
            allowCustomPrintingPrice
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
  async updateStatus(publisherId: number, status: 'Active' | 'Deactivated') {
    const isDeactivating = status === 'Deactivated';

    const title = isDeactivating
      ? 'Deactivate Publisher?'
      : 'Activate Publisher?';
    const html = isDeactivating
      ? `
      <p>Once deactivated, this publisher will no longer be accessible.</p>
      <div class="flex items-center justify-center mt-4">
        <input type="checkbox" id="delistCheckbox" />
        <label for="delistCheckbox" class="ml-2">Also delist all titles</label>
      </div>
    `
      : 'This publisher account will be activated and made accessible again.';

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

    console.log({ result });

    if (!result.isConfirmed) return;

    try {
      await this.publisherService.updatePublisherStatus(
        { status: status as any, delinkTitle: result.value['delist'] },
        publisherId
      );

      Swal.fire({
        title: 'Success',
        text: isDeactivating
          ? 'The publisher has been deactivated successfully.'
          : 'The publisher has been activated successfully.',
        icon: 'success',
        heightAuto: false,
      });

      this.dataSource.data = this.dataSource.data.map((item) =>
        item.id === publisherId ? { ...item, status } : item
      );
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Something went wrong while updating the status.',
        icon: 'error',
        heightAuto: false,
      });
    }
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

  onClickChangePassword(publisher: Publishers) {
    const dialog = this.dialog.open(ChangePassword, {
      data: {
        onClose: () => dialog.close(),
        onSubmit: async (password: string) => {
          console.log({ password });
          await this.authService.changeAuthorPublisherPassword(
            publisher.user.id,
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
