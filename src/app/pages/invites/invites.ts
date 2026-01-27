import {
  Component,
  computed,
  OnInit,
  Signal,
  signal,
  OnDestroy,
} from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../../components/list-table/list-table';
import { InviteService } from '../../services/invite';
import {
  Invite,
  InviteFilter,
  InviteType,
  InviteStatus,
} from '../../interfaces';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from '../../services/logger';
import Swal from 'sweetalert2';
import { Back } from 'src/app/components/back/back';

@Component({
  selector: 'app-invites',
  imports: [SharedModule, ListTable, MatButtonModule, MatIconModule, Back],
  templateUrl: './invites.html',
  styleUrl: './invites.css',
})
export class Invites implements OnInit, OnDestroy {
  constructor(
    private inviteService: InviteService,
    private userService: UserService,
    private router: Router,
    private translateService: TranslateService,
    private logger: Logger,
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  private readonly destroy$ = new Subject<void>();
  loggedInUser!: Signal<User | null>;
  invites = signal<Invite[]>([]);
  dataSource = new MatTableDataSource<any>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  selectedInviteType = signal<InviteType | 'ALL'>('ALL');
  lastPage = signal(1);

  filter = signal<InviteFilter>({
    page: 1,
    itemsPerPage: 30,
  });

  // Determine if user is author (shows received) or not (shows request)
  isAuthor = computed(() => {
    return this.loggedInUser()?.accessLevel === 'AUTHER';
  });

  displayedColumns = computed(() => {
    const columns = ['email', 'type', 'status'];
    // Authors see "invited by" (received invites)
    // Others see "invited to" (request invites)
    if (this.isAuthor()) {
      columns.push('invitedBy');
    } else {
      columns.push('invitedTo');
    }
    columns.push('createdAt', 'actions');
    return columns;
  });

  availableInviteTypes = computed(() => {
    const user = this.loggedInUser();
    if (!user) return [];

    // Don't show filter buttons for authors and sub-publishers
    if (user.accessLevel === 'AUTHER') {
      return [];
    }
    if (
      user.accessLevel === 'PUBLISHER' &&
      user.publisher?.type === 'Sub_Publisher'
    ) {
      return [];
    }

    const types: InviteType[] = [];
    if (user.accessLevel === 'SUPERADMIN') {
      types.push(InviteType.PUBLISHER, InviteType.AUTHER);
    } else if (user.accessLevel === 'PUBLISHER') {
      types.push(InviteType.PUBLISHER, InviteType.AUTHER);
    }
    return types;
  });

  showFilterButtons = computed(() => {
    const user = this.loggedInUser();
    if (!user) return false;
    // Hide filter buttons for authors and sub-publishers
    if (user.accessLevel === 'AUTHER') {
      return false;
    }
    if (
      user.accessLevel === 'PUBLISHER' &&
      user.publisher?.type === 'Sub_Publisher'
    ) {
      return false;
    }
    return true;
  });

  InviteType = InviteType;
  InviteStatus = InviteStatus;

  ngOnInit() {
    // Set filter based on access level
    const loggedInUserId = this.loggedInUser()?.id;
    if (!loggedInUserId) return;

    if (this.isAuthor()) {
      // Authors see invites sent TO them (filter by userId)
      this.filter.update((f) => ({
        ...f,
        userIds: [loggedInUserId],
        invitedByIds: undefined,
      }));
    } else {
      // Others see invites sent BY them (filter by invitedById)
      this.filter.update((f) => ({
        ...f,
        invitedByIds: [loggedInUserId],
        userIds: undefined,
      }));
    }
    this.fetchInvites();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInviteTypeChange(type: InviteType | 'ALL') {
    this.selectedInviteType.set(type);
    this.filter.update((f) => ({
      ...f,
      type: type === 'ALL' ? undefined : type,
      page: 1,
    }));
    this.fetchInvites();
  }

  async fetchInvites(showLoader = true) {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const currentFilter = this.filter();
      const response = await this.inviteService.findMany(
        currentFilter,
        showLoader,
      );

      this.invites.set(response.items);
      this.lastPage.set(Math.ceil(response.totalCount / response.itemsPerPage));
      this.mapInvitesToDataSource(response.items);
    } catch (error) {
      console.error('Error fetching invites:', error);
      const errorMessage =
        this.translateService.instant('error') || 'Failed to fetch invites';
      this.errorMessage.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  private mapInvitesToDataSource(items: Invite[]) {
    const loggedInUserId = this.loggedInUser()?.id;
    const mapped = items.map((invite) => {
      // For authors: show invited by (who sent the invite to them)
      // For others: show invited to (who received the invite)
      let invitedByDisplay = '-';
      if (invite.invitedBy && this.isAuthor()) {
        invitedByDisplay = `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`;
      }

      return {
        ...invite,
        email: invite.email,
        type: invite.type,
        status: invite.status,
        invitedBy: invitedByDisplay,
        invitedTo: invite.user
          ? `${invite.user.firstName} ${invite.user.lastName}`
          : '-',
        createdAt: invite.createdAt
          ? new Date(invite.createdAt).toLocaleDateString()
          : '-',
        actions: '',
      };
    });
    this.dataSource.data = mapped;
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchInvites();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchInvites();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchInvites();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.fetchInvites();
  }

  getPageNumbers(): number[] {
    const currentPage = this.filter().page || 1;
    const totalPages = this.lastPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      }
    }

    return pages;
  }

  async onAcceptInvite(invite: Invite) {
    try {
      let confirmText = '';
      const isAuthor = this.loggedInUser()?.accessLevel === 'AUTHER';
      const isPublisherInvite = invite.type === InviteType.PUBLISHER;

      if (isAuthor && isPublisherInvite) {
        // Special message for authors accepting publisher invites
        confirmText = this.translateService.instant(
          'acceptpublisherinviteconfirm',
        );
      } else {
        // Default message for other cases
        const defaultText = this.translateService.instant(
          'acceptinviteconfirm',
        );
        const reloadWarning =
          this.translateService.instant('sitereloadwarning');
        confirmText = `${defaultText} ${reloadWarning}`;
      }

      const result = await Swal.fire({
        title: this.translateService.instant('confirm'),
        text: confirmText,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: this.translateService.instant('yes'),
        cancelButtonText: this.translateService.instant('no'),
      });

      if (result.isConfirmed) {
        this.isLoading.set(true);
        await this.inviteService.update(invite.token, InviteStatus.ACCEPTED);
        await this.fetchInvites(false);
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text: this.translateService.instant('inviteaccepted'),
        }).then(() => {
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      const errorMessage =
        this.translateService.instant('error') || 'Failed to accept invite';
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: errorMessage,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onRejectInvite(invite: Invite) {
    try {
      const result = await Swal.fire({
        title: this.translateService.instant('confirm'),
        text: this.translateService.instant('rejectinviteconfirm'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translateService.instant('yes'),
        cancelButtonText: this.translateService.instant('no'),
      });

      if (result.isConfirmed) {
        this.isLoading.set(true);
        await this.inviteService.update(invite.token, InviteStatus.REJECTED);
        await this.fetchInvites(false);
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text: this.translateService.instant('inviterejected'),
        });
      }
    } catch (error) {
      console.error('Error rejecting invite:', error);
      const errorMessage =
        this.translateService.instant('error') || 'Failed to reject invite';
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: errorMessage,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onRevokeInvite(invite: Invite) {
    try {
      const result = await Swal.fire({
        title: this.translateService.instant('confirm'),
        text: this.translateService.instant('revokeinviteconfirm'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: this.translateService.instant('yes'),
        cancelButtonText: this.translateService.instant('no'),
      });

      if (result.isConfirmed) {
        this.isLoading.set(true);
        await this.inviteService.update(invite.token, InviteStatus.REVOKED);
        await this.fetchInvites(false);
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text: this.translateService.instant('inviterevoked'),
        });
      }
    } catch (error) {
      console.error('Error revoking invite:', error);
      const errorMessage =
        this.translateService.instant('error') || 'Failed to revoke invite';
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: errorMessage,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  canAcceptOrRejectInvite(invite: Invite): boolean {
    const loggedInUserId = this.loggedInUser()?.id;
    if (!loggedInUserId) return false;
    // Show accept/reject buttons if invite was sent to the logged-in user
    // Access level doesn't matter - any user can accept/reject invites sent to them
    // Check both invite.userId and invite.user?.id to handle different data structures
    const inviteUserId = invite.userId || invite.user?.id;
    return (
      invite.status === InviteStatus.PENDING && inviteUserId === loggedInUserId
    );
  }

  canRevokeInvite(invite: Invite): boolean {
    const loggedInUserId = this.loggedInUser()?.id;
    if (!loggedInUserId) return false;
    // Don't show revoke button if invite was sent TO the logged-in user
    // Only show revoke if invite was sent BY the logged-in user
    const inviteUserId = invite.userId || invite.user?.id;
    if (inviteUserId === loggedInUserId) {
      return false; // Can't revoke invites sent to yourself
    }
    // Show revoke button if invite was sent BY the logged-in user (invitedById matches)
    // Access level doesn't matter
    return (
      invite.status === InviteStatus.PENDING &&
      invite.invitedBy?.id === loggedInUserId
    );
  }
}
