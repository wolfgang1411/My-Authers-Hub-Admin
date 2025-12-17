import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { UserService } from '../../services/user';
import { Logger } from '../../services/logger';
import { TranslateService } from '@ngx-translate/core';
import { StaticValuesService } from '../../services/static-values';
import { User, UserFilter, UserStatus } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { format } from 'date-fns';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    SharedModule,
    ListTable,
    AngularSvgIconModule,
    RouterModule,
    MatIcon,
    MatButton,
    MatIconButton,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users implements OnInit, OnDestroy {
  constructor(
    private readonly userService: UserService,
    private readonly translate: TranslateService,
    private readonly logger: Logger,
    private readonly staticValuesService: StaticValuesService
  ) {}

  lastPage = signal(1);

  filter = signal<UserFilter>({
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
    orderBy: 'id',
    orderByVal: 'desc',
    status: [UserStatus.ACTIVE],
    accessLevel: 'USER',
  });

  searchStr = new Subject<string>();
  private searchSub?: Subscription;

  users = signal<User[]>([]);

  private pageCache = new Map<number, User[]>();
  private cachedFilterKey = '';

  displayedColumns: string[] = [
    'id',
    'name',
    'email',
    'phone',
    'status',
    'accessLevel',
    'createdAt',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>();

  statusTabs = computed(() => {
    const enums = this.staticValuesService.staticValues()?.UserStatus || {};
    const allowedStatuses: UserStatus[] = [
      UserStatus.ACTIVE,
      UserStatus.DEACTIVE,
    ];
    const statusKeys =
      Object.keys(enums).length > 0 ? Object.keys(enums) : allowedStatuses;
    const dynamicTabs = statusKeys
      .filter((key) => allowedStatuses.includes(key as UserStatus))
      .map((key) => ({
        label: key.toLowerCase(),
        value: key as UserStatus,
      }));
    return [{ label: 'all', value: undefined }, ...dynamicTabs];
  });

  statusMenuOptions = computed(() => {
    const enums = this.staticValuesService.staticValues()?.UserStatus || {};
    const allowedStatuses: UserStatus[] = [
      UserStatus.ACTIVE,
      UserStatus.DEACTIVE,
    ];
    const statusKeys =
      Object.keys(enums).length > 0 ? Object.keys(enums) : allowedStatuses;
    return statusKeys
      .filter((key) => allowedStatuses.includes(key as UserStatus))
      .map((key) => key as UserStatus);
  });

  ngOnInit(): void {
    this.searchSub = this.searchStr
      .asObservable()
      .pipe(debounceTime(400))
      .subscribe((value) => {
        this.filter.update((f) => ({ ...f, searchStr: value, page: 1 }));
        this.clearCache();
        this.updateUserList();
      });

    this.updateUserList();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      searchStr: currentFilter.searchStr,
      itemsPerPage: currentFilter.itemsPerPage,
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
      status: currentFilter.status,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  async updateUserList() {
    const currentFilter = this.filter();
    const currentPage = currentFilter.page || 1;
    const filterKey = this.getFilterKey();

    if (this.cachedFilterKey !== filterKey) {
      this.clearCache();
      this.cachedFilterKey = filterKey;
    }

    if (this.pageCache.has(currentPage)) {
      const cachedUsers = this.pageCache.get(currentPage)!;
      this.users.set(cachedUsers);
      this.mapUsersToDataSource(cachedUsers);
      return;
    }

    try {
      const { status, ...rest } = currentFilter;
      const normalizedStatus = status
        ? Array.isArray(status)
          ? status
          : [status]
        : undefined;

      const response = await this.userService.fetchUsers({
        ...rest,
        status: normalizedStatus,
        accessLevel: 'USER',
      });

      this.pageCache.set(currentPage, response.items);
      this.users.set(response.items);
      this.lastPage.set(Math.ceil(response.totalCount / response.itemsPerPage));
      this.mapUsersToDataSource(response.items);
    } catch (error) {
      this.logger.logError(error);
    }
  }

  async changeUserStatus(userId: number, status: UserStatus) {
    const targetStatus = status;
    const confirmation = await Swal.fire({
      icon: 'warning',
      title:
        this.translate.instant('userstatuswarningtitle') ||
        'Change user status?',
      text:
        this.translate.instant('userstatuswarningtext', {
          status: targetStatus.toLowerCase(),
        }) || `Do you want to change status to ${targetStatus.toLowerCase()}?`,
      showCancelButton: true,
      confirmButtonText: this.translate.instant('yes') || 'Yes',
      cancelButtonText: this.translate.instant('no') || 'No',
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const updated = await this.userService.updateStatus(userId, targetStatus);

      const updater = (list?: User[]) =>
        (list || []).map((u) => (u.id === userId ? { ...u, ...updated } : u));

      this.users.update((users) => updater(users));

      const newCache = new Map(this.pageCache);
      newCache.forEach((users, key) => {
        newCache.set(key, updater(users));
      });
      this.pageCache = newCache;
      this.mapUsersToDataSource(this.users());

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

  private mapUsersToDataSource(users: User[]) {
    this.dataSource.data = users.map((user, index) => {
      const status =
        user.status || (user.active ? UserStatus.ACTIVE : UserStatus.DEACTIVE);
      return {
        ...user,
        serial: index + 1,
        name:
          user.fullName ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          '—',
        email: user.email || '—',
        phone: user.phoneNumber || '—',
        status,
        accessLevel: user.accessLevel || 'USER',
        createdAt: user.created_date
          ? format(user.created_date, 'dd-MM-yyyy HH:mm')
          : '',
      };
    });
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.updateUserList();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.updateUserList();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.updateUserList();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.updateUserList();
  }

  onStatusTabChange(status?: UserStatus) {
    this.filter.update((f) => ({ ...f, status, page: 1 }));
    this.clearCache();
    this.updateUserList();
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

  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'fullName',
      email: 'email',
      phone: 'phoneNumber',
      status: 'status',
      accessLevel: 'accessLevel',
      createdAt: 'created_date',
      id: 'id',
    };
    return columnMap[column] || null;
  };

  isSortable = (column: string): boolean => {
    return this.getApiFieldName(column) !== null;
  };

  onSortChange(sort: { active: string; direction: 'asc' | 'desc' | '' }) {
    const apiFieldName = this.getApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.filter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.clearCache();
    this.updateUserList();
  }

  isArrayStatus(status?: UserStatus | UserStatus[]) {
    return Array.isArray(status);
  }

  statusIncludes(
    status: UserStatus | UserStatus[] | undefined,
    value?: UserStatus
  ) {
    if (!value) return false;
    if (!status) return false;
    const list = Array.isArray(status) ? status : [status];
    return list.includes(value);
  }

  nextStatus(status?: UserStatus): UserStatus {
    return status === UserStatus.ACTIVE
      ? UserStatus.DEACTIVE
      : UserStatus.ACTIVE;
  }
}
