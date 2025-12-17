import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user';
import { User, UserStatus } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { Back } from '../../components/back/back';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Logger } from '../../services/logger';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { exportToExcel } from '../../common/utils/excel';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [
    SharedModule,
    Back,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './user-details.html',
  styleUrl: './user-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetails implements OnInit {
  constructor(
    private readonly userService: UserService,
    private readonly route: ActivatedRoute,
    private readonly logger: Logger,
    private readonly translate: TranslateService
  ) {
    this.route.params.subscribe(({ id }) => {
      this.userId = Number(id);
    });
  }

  userId!: number;
  user = signal<User | null>(null);

  statusOptions = [UserStatus.ACTIVE, UserStatus.DEACTIVE];

  getNextStatus(status?: UserStatus) {
    return status === UserStatus.ACTIVE ? UserStatus.DEACTIVE : UserStatus.ACTIVE;
  }

  displayName = computed(() => {
    const current = this.user();
    return (
      current?.fullName ||
      `${current?.firstName || ''} ${current?.lastName || ''}`.trim() ||
      '—'
    );
  });

  async ngOnInit() {
    await this.loadUser();
  }

  private async loadUser() {
    try {
      const response = await this.userService.fetchUser(this.userId);
      this.user.set(response);
    } catch (error) {
      this.logger.logError(error);
    }
  }

  statusClass(status?: UserStatus) {
    return status === UserStatus.ACTIVE
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }

  async changeStatus(status: UserStatus) {
    if (!this.user()?.id) return;
    const confirmation = await Swal.fire({
      icon: 'warning',
      title:
        this.translate.instant('userstatuswarningtitle') ||
        'Change user status?',
      text:
        this.translate.instant('userstatuswarningtext', {
          status: status.toLowerCase(),
        }) ||
        `Do you want to change status to ${status.toLowerCase()}?`,
      showCancelButton: true,
      confirmButtonText: this.translate.instant('yes') || 'Yes',
      cancelButtonText: this.translate.instant('no') || 'No',
    });

    if (!confirmation.isConfirmed) return;

    try {
      await this.userService.updateStatus(this.user()!.id, status);
      await this.loadUser();

      Swal.fire({
        icon: 'success',
        title: this.translate.instant('statusupdated') || 'Status updated',
      });
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translate.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translate.instant('somethingwentwrong') ||
          'Something went wrong',
      });
    }
  }

  onExportUser() {
    const current = this.user();
    if (!current) return;

    const rows = [
      {
        id: current.id,
        name:
          current.fullName ||
          `${current.firstName || ''} ${current.lastName || ''}`.trim(),
        email: current.email,
        phone: current.phoneNumber,
        status: current.status || (current.active ? 'ACTIVE' : 'DEACTIVE'),
        accessLevel: current.accessLevel,
        createdAt: current.created_date,
        modifiedAt: current.modified_date,
      },
    ];

    exportToExcel(rows, `user-${current.id}`, {
      id: this.translate.instant('id') || 'ID',
      name: this.translate.instant('name') || 'Name',
      email: this.translate.instant('email') || 'Email',
      phone: this.translate.instant('phone') || 'Phone',
      status: this.translate.instant('status') || 'Status',
      accessLevel: this.translate.instant('accesslevel') || 'Access Level',
      createdAt: this.translate.instant('createdat') || 'Created at',
      modifiedAt: this.translate.instant('modifiedat') || 'Modified at',
    });
  }
}

