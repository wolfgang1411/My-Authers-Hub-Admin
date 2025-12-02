import {
  Component,
  computed,
  OnDestroy,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { UserService } from '../../services/user';
import {
  User,
  UpdateTicket,
  UpdateTicketType,
  UpdateTicketStatus,
} from '../../interfaces';
import { UpdateTicketFilter } from '../../interfaces/Titles';
import { TicketDetailsDialog } from 'src/app/components/ticket-details-dialog/ticket-details-dialog';

@Component({
  selector: 'app-update-ticket-list',
  imports: [
    SharedModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatIconButton,
    MatDialogModule,
    ListTable,
  ],
  templateUrl: './update-ticket-list.html',
  styleUrl: './update-ticket-list.css',
})
export class UpdateTicketList implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loggedInUser!: Signal<User | null>;
  isSuperAdmin = computed(
    () => this.loggedInUser()?.accessLevel === 'SUPERADMIN'
  );

  selectedTabIndex = signal(0);
  searchStr = new Subject<string>();
  selectedStatus = signal<UpdateTicketStatus | 'ALL'>(
    UpdateTicketStatus.PENDING
  );

  // Track which tabs have been fetched
  private fetchedTabs = new Set<number>();

  // Total counts for each tab
  addressUpdateTotalCount = signal(0);
  bankUpdateTotalCount = signal(0);
  authorUpdateTotalCount = signal(0);
  publisherUpdateTotalCount = signal(0);

  // Ticket data signals
  addressUpdateTickets = signal<UpdateTicket[]>([]);
  bankUpdateTickets = signal<UpdateTicket[]>([]);
  authorUpdateTickets = signal<UpdateTicket[]>([]);
  publisherUpdateTickets = signal<UpdateTicket[]>([]);

  // Data sources for tables
  addressUpdateDataSource = new MatTableDataSource<any>([]);
  bankUpdateDataSource = new MatTableDataSource<any>([]);
  authorUpdateDataSource = new MatTableDataSource<any>([]);
  publisherUpdateDataSource = new MatTableDataSource<any>([]);

  // Display columns
  addressUpdateColumns: string[] = [
    'requestedBy',
    'changes',
    'status',
    'createdAt',
    'actions',
  ];
  bankUpdateColumns: string[] = [
    'requestedBy',
    'changes',
    'status',
    'createdAt',
    'actions',
  ];
  authorUpdateColumns: string[] = [
    'requestedBy',
    'changes',
    'status',
    'createdAt',
    'actions',
  ];
  publisherUpdateColumns: string[] = [
    'requestedBy',
    'changes',
    'status',
    'createdAt',
    'actions',
  ];

  // Per-tab filters
  private addressUpdateFilter: UpdateTicketFilter = {
    page: 1,
    itemsPerPage: 30,
    status: UpdateTicketStatus.PENDING as 'PENDING' | 'APPROVED' | 'REJECTED',
    type: UpdateTicketType.ADDRESS,
  };
  private bankUpdateFilter: UpdateTicketFilter = {
    page: 1,
    itemsPerPage: 30,
    status: UpdateTicketStatus.PENDING as 'PENDING' | 'APPROVED' | 'REJECTED',
    type: UpdateTicketType.BANK,
  };
  private authorUpdateFilter: UpdateTicketFilter = {
    page: 1,
    itemsPerPage: 30,
    status: UpdateTicketStatus.PENDING as 'PENDING' | 'APPROVED' | 'REJECTED',
    type: UpdateTicketType.AUTHOR,
  };
  private publisherUpdateFilter: UpdateTicketFilter = {
    page: 1,
    itemsPerPage: 30,
    status: UpdateTicketStatus.PENDING as 'PENDING' | 'APPROVED' | 'REJECTED',
    type: UpdateTicketType.PUBLISHER,
  };

  UpdateTicketStatus = UpdateTicketStatus;
  UpdateTicketType = UpdateTicketType;

  constructor(
    private userService: UserService,
    private translateService: TranslateService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    // Check query parameters to determine initial tab
    const params = this.route.snapshot.queryParams;
    const tab = params['tab'];
    let initialTabIndex = this.getTabIndexFromName(tab);
    this.selectedTabIndex.set(initialTabIndex);

    // Subscribe to query param changes for navigation
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((queryParams) => {
        const tabParam = queryParams['tab'];
        const tabIndex = this.getTabIndexFromName(tabParam);
        if (this.selectedTabIndex() !== tabIndex) {
          this.selectedTabIndex.set(tabIndex);
          if (!this.fetchedTabs.has(tabIndex)) {
            this.fetchTicketsForCurrentTab();
          }
        }
      });

    // Fetch initial tickets
    this.fetchTicketsForCurrentTab();

    this.searchStr
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe((value) => {
        const tabIndex = this.selectedTabIndex();
        this.resetTabFilter(tabIndex);
        const filter = this.getFilterForTab(tabIndex);
        filter.page = 1;
        filter.searchStr = value;
        if (!value?.length) {
          delete filter.searchStr;
        }
        this.fetchedTabs.delete(tabIndex);
        this.fetchTicketsForCurrentTab();
      });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    // Update query params when tab changes (optional - for bookmarking)
    const tabName = this.getTabNameByIndex(index);
    if (tabName) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: tabName },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    if (!this.fetchedTabs.has(index)) {
      this.fetchTicketsForCurrentTab();
    }
  }

  private getTabNameByIndex(index: number): string | undefined {
    const isAuthor = this.loggedInUser()?.accessLevel === 'AUTHER';
    
    // For authors, publisher tab is hidden, so indices shift
    if (isAuthor) {
      switch (index) {
        case 0:
          return 'address';
        case 1:
          return 'bank';
        case 2:
          return 'author';
        default:
          return undefined;
      }
    }
    
    // For publishers and superadmins, all tabs are visible
    switch (index) {
      case 0:
        return 'address';
      case 1:
        return 'bank';
      case 2:
        return 'author';
      case 3:
        return 'publisher';
      default:
        return undefined;
    }
  }

  private getTabIndexFromName(tabName: string | undefined): number {
    const isAuthor = this.loggedInUser()?.accessLevel === 'AUTHER';
    
    switch (tabName) {
      case 'address':
        return 0;
      case 'bank':
        return 1;
      case 'author':
        return 2;
      case 'publisher':
        // For authors, publisher tab doesn't exist, default to author tab
        return isAuthor ? 2 : 3;
      default:
        return 0; // Default to ADDRESS tab
    }
  }

  onStatusChange(status: UpdateTicketStatus | 'ALL'): void {
    this.selectedStatus.set(status);
    const tabIndex = this.selectedTabIndex();
    this.resetTabFilter(tabIndex);
    const filter = this.getFilterForTab(tabIndex);
    filter.page = 1;
    if (status === 'ALL') {
      delete filter.status;
    } else {
      // Convert enum to string value for the filter
      filter.status = status as 'PENDING' | 'APPROVED' | 'REJECTED';
    }
    this.fetchedTabs.delete(tabIndex);
    this.fetchTicketsForCurrentTab();
  }

  private fetchTicketsForCurrentTab(): void {
    const tabIndex = this.selectedTabIndex();
    switch (tabIndex) {
      case 0:
        this.fetchAddressUpdateTickets();
        break;
      case 1:
        this.fetchBankUpdateTickets();
        break;
      case 2:
        this.fetchAuthorUpdateTickets();
        break;
      case 3:
        this.fetchPublisherUpdateTickets();
        break;
    }
  }

  private getFilterForTab(tabIndex: number): UpdateTicketFilter {
    switch (tabIndex) {
      case 0:
        return this.addressUpdateFilter;
      case 1:
        return this.bankUpdateFilter;
      case 2:
        return this.authorUpdateFilter;
      case 3:
        return this.publisherUpdateFilter;
      default:
        return this.addressUpdateFilter;
    }
  }

  private resetTabFilter(tabIndex: number): void {
    const currentStatus = this.selectedStatus();
    const baseFilter: UpdateTicketFilter = {
      page: 1,
      itemsPerPage: 30,
      status:
        currentStatus !== 'ALL'
          ? (currentStatus as 'PENDING' | 'APPROVED' | 'REJECTED')
          : undefined,
    };
    switch (tabIndex) {
      case 0:
        this.addressUpdateFilter = {
          ...baseFilter,
          type: UpdateTicketType.ADDRESS,
        };
        this.addressUpdateTickets.set([]);
        break;
      case 1:
        this.bankUpdateFilter = { ...baseFilter, type: UpdateTicketType.BANK };
        this.bankUpdateTickets.set([]);
        break;
      case 2:
        this.authorUpdateFilter = {
          ...baseFilter,
          type: UpdateTicketType.AUTHOR,
        };
        this.authorUpdateTickets.set([]);
        break;
      case 3:
        this.publisherUpdateFilter = {
          ...baseFilter,
          type: UpdateTicketType.PUBLISHER,
        };
        this.publisherUpdateTickets.set([]);
        break;
    }
  }

  loadMoreTickets(): void {
    const tabIndex = this.selectedTabIndex();
    const filter = this.getFilterForTab(tabIndex);
    filter.page = (filter.page || 1) + 1;
    this.fetchTicketsForCurrentTab();
  }

  hasMoreTickets(tabIndex: number): boolean {
    const filter = this.getFilterForTab(tabIndex);
    const currentCount = this.getCurrentCountForTab(tabIndex);
    const totalCount = this.getTotalCountForTab(tabIndex);
    return currentCount < totalCount;
  }

  private getCurrentCountForTab(tabIndex: number): number {
    switch (tabIndex) {
      case 0:
        return this.addressUpdateTickets().length;
      case 1:
        return this.bankUpdateTickets().length;
      case 2:
        return this.authorUpdateTickets().length;
      case 3:
        return this.publisherUpdateTickets().length;
      default:
        return 0;
    }
  }

  private getTotalCountForTab(tabIndex: number): number {
    switch (tabIndex) {
      case 0:
        return this.addressUpdateTotalCount();
      case 1:
        return this.bankUpdateTotalCount();
      case 2:
        return this.authorUpdateTotalCount();
      case 3:
        return this.publisherUpdateTotalCount();
      default:
        return 0;
    }
  }

  async fetchAddressUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.userService.getUpdateTickets(
        this.addressUpdateFilter
      );

      if (response.totalCount !== undefined) {
        this.addressUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.addressUpdateTickets();
      const newTickets = response.items || [];

      if (this.addressUpdateFilter.page === 1) {
        this.addressUpdateTickets.set(newTickets);
      } else {
        this.addressUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapAddressUpdateTickets();
      this.fetchedTabs.add(0);
    } catch (error) {
      console.error('Error fetching address update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch address update tickets.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchBankUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.userService.getUpdateTickets(
        this.bankUpdateFilter
      );

      if (response.totalCount !== undefined) {
        this.bankUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.bankUpdateTickets();
      const newTickets = response.items || [];

      if (this.bankUpdateFilter.page === 1) {
        this.bankUpdateTickets.set(newTickets);
      } else {
        this.bankUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapBankUpdateTickets();
      this.fetchedTabs.add(1);
    } catch (error) {
      console.error('Error fetching bank update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch bank update tickets.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchAuthorUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.userService.getUpdateTickets(
        this.authorUpdateFilter
      );

      if (response.totalCount !== undefined) {
        this.authorUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.authorUpdateTickets();
      const newTickets = response.items || [];

      if (this.authorUpdateFilter.page === 1) {
        this.authorUpdateTickets.set(newTickets);
      } else {
        this.authorUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapAuthorUpdateTickets();
      this.fetchedTabs.add(2);
    } catch (error) {
      console.error('Error fetching author update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch author update tickets.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchPublisherUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.userService.getUpdateTickets(
        this.publisherUpdateFilter
      );

      if (response.totalCount !== undefined) {
        this.publisherUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.publisherUpdateTickets();
      const newTickets = response.items || [];

      if (this.publisherUpdateFilter.page === 1) {
        this.publisherUpdateTickets.set(newTickets);
      } else {
        this.publisherUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapPublisherUpdateTickets();
      this.fetchedTabs.add(3);
    } catch (error) {
      console.error('Error fetching publisher update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch publisher update tickets.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private mapAddressUpdateTickets(): void {
    const mapped = this.addressUpdateTickets().map((ticket) => {
      const changes: string[] = [];
      const data = ticket.data || {};

      if (data['address']) changes.push('Address');
      if (data['city']) changes.push('City');
      if (data['state']) changes.push('State');
      if (data['country']) changes.push('Country');
      if (data['pincode']) changes.push('Pincode');

      return {
        id: ticket.id,
        requestedBy:
          ticket.requestedBy?.firstName && ticket.requestedBy?.lastName
            ? `${ticket.requestedBy.firstName} ${ticket.requestedBy.lastName}`
            : ticket.requestedBy?.email || 'N/A',
        changes: changes.length,
        changesList: changes,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.addressUpdateDataSource.data = mapped;
  }

  private mapBankUpdateTickets(): void {
    const mapped = this.bankUpdateTickets().map((ticket) => {
      const changes: string[] = [];
      const data = ticket.data || {};

      // Backend stores with specific field names
      if (data['bankName']) changes.push('Bank Name');
      if (data['accountNo']) changes.push('Account No');
      if (data['ifsc']) changes.push('IFSC');
      if (data['panCardNo']) changes.push('PAN Card');
      if (data['accountType']) changes.push('Account Type');
      if (data['gstNumber']) changes.push('GST Number');
      if (data['accountHolderName']) changes.push('Account Holder Name');

      return {
        id: ticket.id,
        requestedBy:
          ticket.requestedBy?.firstName && ticket.requestedBy?.lastName
            ? `${ticket.requestedBy.firstName} ${ticket.requestedBy.lastName}`
            : ticket.requestedBy?.email || 'N/A',
        changes: changes.length,
        changesList: changes,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.bankUpdateDataSource.data = mapped;
  }

  private mapAuthorUpdateTickets(): void {
    const mapped = this.authorUpdateTickets().map((ticket) => {
      const changes: string[] = [];
      const data = ticket.data || {};

      // Backend stores with 'author' prefix
      if (data['authorName']) changes.push('Name');
      if (data['authorEmail']) changes.push('Email');
      if (data['authorContactNumber']) changes.push('Contact Number');
      if (data['authorAbout']) changes.push('About');
      if (data['authorUsername']) changes.push('Username');

      return {
        id: ticket.id,
        requestedBy:
          ticket.requestedBy?.firstName && ticket.requestedBy?.lastName
            ? `${ticket.requestedBy.firstName} ${ticket.requestedBy.lastName}`
            : ticket.requestedBy?.email || 'N/A',
        changes: changes.length,
        changesList: changes,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.authorUpdateDataSource.data = mapped;
  }

  private mapPublisherUpdateTickets(): void {
    const mapped = this.publisherUpdateTickets().map((ticket) => {
      const changes: string[] = [];
      const data = ticket.data || {};

      // Backend stores with 'publisher' prefix
      if (data['publisherName']) changes.push('Name');
      if (data['publisherEmail']) changes.push('Email');
      if (data['publisherPocName']) changes.push('POC Name');
      if (data['publisherPocEmail']) changes.push('POC Email');
      if (data['publisherPocPhoneNumber']) changes.push('POC Phone');
      if (data['publisherDesignation']) changes.push('Designation');

      return {
        id: ticket.id,
        requestedBy:
          ticket.requestedBy?.firstName && ticket.requestedBy?.lastName
            ? `${ticket.requestedBy.firstName} ${ticket.requestedBy.lastName}`
            : ticket.requestedBy?.email || 'N/A',
        changes: changes.length,
        changesList: changes,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.publisherUpdateDataSource.data = mapped;
  }

  async onApproveTicket(ticket: UpdateTicket): Promise<void> {
    const { value } = await Swal.fire({
      icon: 'warning',
      title: this.translateService.instant('areyousure'),
      text:
        this.translateService.instant('approveticketwarning') ||
        'Are you sure you want to approve this ticket?',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('yes'),
      cancelButtonText: this.translateService.instant('no'),
    });

    if (!value) return;

    try {
      this.isLoading.set(true);
      await this.userService.approveUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketapproved') ||
          'Ticket approved successfully.',
      });
      const tabIndex = this.selectedTabIndex();
      this.resetTabFilter(tabIndex);
      this.fetchedTabs.delete(tabIndex);
      this.fetchTicketsForCurrentTab();
    } catch (error) {
      console.error('Error approving ticket:', error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('errorapprovingticket') ||
          'Failed to approve ticket.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onRejectTicket(ticket: UpdateTicket): Promise<void> {
    const { value } = await Swal.fire({
      icon: 'warning',
      title: this.translateService.instant('areyousure'),
      text:
        this.translateService.instant('rejectticketwarning') ||
        'Are you sure you want to reject this ticket?',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('yes'),
      cancelButtonText: this.translateService.instant('no'),
    });

    if (!value) return;

    try {
      this.isLoading.set(true);
      await this.userService.rejectUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketrejected') ||
          'Ticket rejected successfully.',
      });
      const tabIndex = this.selectedTabIndex();
      this.resetTabFilter(tabIndex);
      this.fetchedTabs.delete(tabIndex);
      this.fetchTicketsForCurrentTab();
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('errorrejectingticket') ||
          'Failed to reject ticket.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  // onViewTicket(ticket: any): void {
  //   // TODO: Create view ticket dialog component
  //   Swal.fire({
  //     icon: 'info',
  //     title: 'Ticket Details',
  //     html: `
  //       <div style="text-align: left;">
  //         <p><strong>Type:</strong> ${ticket.ticket.type}</p>
  //         <p><strong>Status:</strong> ${ticket.ticket.status}</p>
  //         <p><strong>Requested By:</strong> ${ticket.requestedBy}</p>
  //         <p><strong>Created At:</strong> ${ticket.createdAt}</p>
  //         <p><strong>Changes:</strong> ${ticket.changesList.join(', ')}</p>
  //       </div>
  //     `,
  //     width: '600px',
  //   });
  // }
  onViewTicket(ticket: any) {
    this.dialog.open(TicketDetailsDialog, {
      width: '550px',
      data: {
        ...ticket,
        onApprove: (t: any) => this.onApproveTicket(t),
        onReject: (t: any) => this.onRejectTicket(t),
        isSuperAdmin: this.isSuperAdmin(),
      },
      panelClass: 'custom-dialog',
    });
  }
}
