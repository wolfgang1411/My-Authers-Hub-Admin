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
import { Router } from '@angular/router';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { TitleService } from '../titles/title-service';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { PlatformService } from '../../services/platform';
import {
  TitleUpdateTicket,
  TitlePrintingUpdateTicket,
  PricingUpdateTicket,
  RoyaltyUpdateTicket,
  TitleMediaUpdateTicket,
  TitleDistributionUpdateTicket,
  UpdateTicketFilter,
} from '../../interfaces/Titles';
import { ViewTicketDialog } from '../../components/view-ticket-dialog/view-ticket-dialog';
import { Back } from 'src/app/components/back/back';

@Component({
  selector: 'app-update-title-ticket',
  imports: [
    SharedModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatIconButton,
    MatDialogModule,
    ListTable,
    Back,
  ],
  templateUrl: './update-title-ticket.html',
  styleUrl: './update-title-ticket.css',
})
export class UpdateTitleTicket implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loggedInUser!: Signal<User | null>;
  isSuperAdmin = computed(
    () => this.loggedInUser()?.accessLevel === 'SUPERADMIN',
  );

  selectedTabIndex = signal(0);
  searchStr = new Subject<string>();

  // Track which tabs have been fetched
  private fetchedTabs = new Set<number>();

  // Total counts for each tab
  titleUpdateTotalCount = signal(0);
  printingUpdateTotalCount = signal(0);
  pricingUpdateTotalCount = signal(0);
  royaltyUpdateTotalCount = signal(0);
  mediaUpdateTotalCount = signal(0);
  distributionUpdateTotalCount = signal(0);

  // Ticket data signals
  titleUpdateTickets = signal<TitleUpdateTicket[]>([]);
  printingUpdateTickets = signal<TitlePrintingUpdateTicket[]>([]);
  pricingUpdateTickets = signal<PricingUpdateTicket[]>([]);
  royaltyUpdateTickets = signal<RoyaltyUpdateTicket[]>([]);
  mediaUpdateTickets = signal<TitleMediaUpdateTicket[]>([]);
  distributionUpdateTickets = signal<TitleDistributionUpdateTicket[]>([]);

  // Data sources for tables
  titleUpdateDataSource = new MatTableDataSource<any>([]);
  printingUpdateDataSource = new MatTableDataSource<any>([]);
  pricingUpdateDataSource = new MatTableDataSource<any>([]);
  royaltyUpdateDataSource = new MatTableDataSource<any>([]);
  mediaUpdateDataSource = new MatTableDataSource<any>([]);
  distributionUpdateDataSource = new MatTableDataSource<any>([]);

  // Display columns
  titleUpdateColumns: string[] = [
    'title',
    'publisher',
    'requestedBy',
    'changes',
    'status',
    'createdAt',
    'actions',
  ];
  printingUpdateColumns: string[] = [
    'title',
    'publisher',
    'requestedBy',
    'changes',
    'status',
    'createdAt',
    'actions',
  ];
  pricingUpdateColumns: string[] = [
    'title',
    'publisher',
    'requestedBy',
    'platforms',
    'status',
    'createdAt',
    'actions',
  ];
  royaltyUpdateColumns: string[] = [
    'title',
    'publisher',
    'requestedBy',
    'royaltiesCount',
    'status',
    'createdAt',
    'actions',
  ];
  mediaUpdateColumns: string[] = [
    'title',
    'publisher',
    'requestedBy',
    'mediaType',
    'status',
    'createdAt',
    'actions',
  ];
  distributionUpdateColumns: string[] = [
    'title',
    'publisher',
    'requestedBy',
    'distributions',
    'status',
    'createdAt',
    'actions',
  ];

  filter: UpdateTicketFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'PENDING',
  };

  // Per-tab filters
  private titleUpdateFilter: UpdateTicketFilter = { ...this.filter };
  private printingUpdateFilter: UpdateTicketFilter = { ...this.filter };
  private pricingUpdateFilter: UpdateTicketFilter = { ...this.filter };
  private royaltyUpdateFilter: UpdateTicketFilter = { ...this.filter };
  private mediaUpdateFilter: UpdateTicketFilter = { ...this.filter };
  private distributionUpdateFilter: UpdateTicketFilter = { ...this.filter };

  constructor(
    private titleService: TitleService,
    private translateService: TranslateService,
    private userService: UserService,
    private router: Router,
    private dialog: MatDialog,
    private platformService: PlatformService,
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
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
    if (!this.fetchedTabs.has(index)) {
      this.fetchTicketsForCurrentTab();
    }
  }

  private fetchTicketsForCurrentTab(): void {
    const tabIndex = this.selectedTabIndex();
    switch (tabIndex) {
      case 0:
        this.fetchTitleUpdateTickets();
        break;
      case 1:
        this.fetchPrintingUpdateTickets();
        break;
      case 2:
        this.fetchPricingUpdateTickets();
        break;
      case 3:
        this.fetchRoyaltyUpdateTickets();
        break;
      case 4:
        this.fetchMediaUpdateTickets();
        break;
      case 5:
        this.fetchDistributionUpdateTickets();
        break;
    }
  }

  private getFilterForTab(tabIndex: number): UpdateTicketFilter {
    switch (tabIndex) {
      case 0:
        return this.titleUpdateFilter;
      case 1:
        return this.printingUpdateFilter;
      case 2:
        return this.pricingUpdateFilter;
      case 3:
        return this.royaltyUpdateFilter;
      case 4:
        return this.mediaUpdateFilter;
      case 5:
        return this.distributionUpdateFilter;
      default:
        return this.filter;
    }
  }
  getActiveMobileData() {
    switch (this.selectedTabIndex()) {
      case 0:
        return this.titleUpdateDataSource.data;
      case 1:
        return this.printingUpdateDataSource.data;
      case 2:
        return this.pricingUpdateDataSource.data;
      case 3:
        return this.royaltyUpdateDataSource.data;
      case 4:
        return this.mediaUpdateDataSource.data;
      case 5:
        return this.distributionUpdateDataSource.data;
      default:
        return [];
    }
  }

  private resetTabFilter(tabIndex: number): void {
    const baseFilter: UpdateTicketFilter = {
      page: 1,
      itemsPerPage: 30,
      status: 'PENDING',
    };
    switch (tabIndex) {
      case 0:
        this.titleUpdateFilter = { ...baseFilter };
        this.titleUpdateTickets.set([]);
        break;
      case 1:
        this.printingUpdateFilter = { ...baseFilter };
        this.printingUpdateTickets.set([]);
        break;
      case 2:
        this.pricingUpdateFilter = { ...baseFilter };
        this.pricingUpdateTickets.set([]);
        break;
      case 3:
        this.royaltyUpdateFilter = { ...baseFilter };
        this.royaltyUpdateTickets.set([]);
        break;
      case 4:
        this.mediaUpdateFilter = { ...baseFilter };
        this.mediaUpdateTickets.set([]);
        break;
      case 5:
        this.distributionUpdateFilter = { ...baseFilter };
        this.distributionUpdateTickets.set([]);
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
        return this.titleUpdateTickets().length;
      case 1:
        return this.printingUpdateTickets().length;
      case 2:
        return this.pricingUpdateTickets().length;
      case 3:
        return this.royaltyUpdateTickets().length;
      case 4:
        return this.mediaUpdateTickets().length;
      case 5:
        return this.distributionUpdateTickets().length;
      default:
        return 0;
    }
  }

  private getTotalCountForTab(tabIndex: number): number {
    switch (tabIndex) {
      case 0:
        return this.titleUpdateTotalCount();
      case 1:
        return this.printingUpdateTotalCount();
      case 2:
        return this.pricingUpdateTotalCount();
      case 3:
        return this.royaltyUpdateTotalCount();
      case 4:
        return this.mediaUpdateTotalCount();
      case 5:
        return this.distributionUpdateTotalCount();
      default:
        return 0;
    }
  }

  async fetchTitleUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.titleService.getTitleUpdateTickets(
        this.titleUpdateFilter,
      );

      if (response.totalCount !== undefined) {
        this.titleUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.titleUpdateTickets();
      const newTickets = response.items || [];

      if (this.titleUpdateFilter.page === 1) {
        this.titleUpdateTickets.set(newTickets);
      } else {
        this.titleUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapTitleUpdateTickets();
      this.fetchedTabs.add(0);
    } catch (error) {
      console.error('Error fetching title update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch title update tickets.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchPrintingUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.titleService.getTitlePrintingUpdateTickets(
        this.printingUpdateFilter,
      );

      if (response.totalCount !== undefined) {
        this.printingUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.printingUpdateTickets();
      const newTickets = response.items || [];

      if (this.printingUpdateFilter.page === 1) {
        this.printingUpdateTickets.set(newTickets);
      } else {
        this.printingUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapPrintingUpdateTickets();
      this.fetchedTabs.add(1);
    } catch (error) {
      console.error('Error fetching printing update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch printing update tickets.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchPricingUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.titleService.getPricingUpdateTickets(
        this.pricingUpdateFilter,
      );

      if (response.totalCount !== undefined) {
        this.pricingUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.pricingUpdateTickets();
      const newTickets = response.items || [];

      if (this.pricingUpdateFilter.page === 1) {
        this.pricingUpdateTickets.set(newTickets);
      } else {
        this.pricingUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapPricingUpdateTickets();
      this.fetchedTabs.add(2);
    } catch (error) {
      console.error('Error fetching pricing update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch pricing update tickets.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchRoyaltyUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.titleService.getRoyaltyUpdateTickets(
        this.royaltyUpdateFilter,
      );

      if (response.totalCount !== undefined) {
        this.royaltyUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.royaltyUpdateTickets();
      const newTickets = response.items || [];

      if (this.royaltyUpdateFilter.page === 1) {
        this.royaltyUpdateTickets.set(newTickets);
      } else {
        this.royaltyUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapRoyaltyUpdateTickets();
      this.fetchedTabs.add(3);
    } catch (error) {
      console.error('Error fetching royalty update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch royalty update tickets.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchMediaUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response = await this.titleService.getTitleMediaUpdateTickets(
        this.mediaUpdateFilter,
      );

      if (response.totalCount !== undefined) {
        this.mediaUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.mediaUpdateTickets();
      const newTickets = response.items || [];

      if (this.mediaUpdateFilter.page === 1) {
        this.mediaUpdateTickets.set(newTickets);
      } else {
        this.mediaUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapMediaUpdateTickets();
      this.fetchedTabs.add(4);
    } catch (error) {
      console.error('Error fetching media update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch media update tickets.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async fetchDistributionUpdateTickets(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const response =
        await this.titleService.getTitleDistributionUpdateTickets(
          this.distributionUpdateFilter,
        );

      if (response.totalCount !== undefined) {
        this.distributionUpdateTotalCount.set(response.totalCount);
      }

      const currentTickets = this.distributionUpdateTickets();
      const newTickets = response.items || [];

      if (this.distributionUpdateFilter.page === 1) {
        this.distributionUpdateTickets.set(newTickets);
      } else {
        this.distributionUpdateTickets.set([...currentTickets, ...newTickets]);
      }

      this.mapDistributionUpdateTickets();
      this.fetchedTabs.add(5);
    } catch (error) {
      console.error('Error fetching distribution update tickets:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingtickets') ||
          'Failed to fetch distribution update tickets.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private mapTitleUpdateTickets(): void {
    const mapped = this.titleUpdateTickets().map((ticket) => {
      const changes: string[] = [];

      // Only add fields that have actual values (not null, undefined, or empty strings)
      if (ticket.name && ticket.name.trim()) changes.push('Name');
      if (ticket.subTitle && ticket.subTitle.trim()) changes.push('Subtitle');
      if (ticket.isbnPrint && ticket.isbnPrint.trim())
        changes.push('ISBN Print');
      if (ticket.isbnEbook && ticket.isbnEbook.trim())
        changes.push('ISBN Ebook');
      if (ticket.subject && ticket.subject.trim()) changes.push('Subject');
      if (ticket.language && ticket.language.trim()) changes.push('Language');
      if (ticket.longDescription && ticket.longDescription.trim())
        changes.push('Long Description');
      if (ticket.shortDescription && ticket.shortDescription.trim())
        changes.push('Short Description');
      if (ticket.edition && ticket.edition.toString().trim())
        changes.push('Edition');
      if (ticket.keywords && ticket.keywords.trim()) changes.push('Keywords');
      if (
        ticket.authorIds &&
        Array.isArray(ticket.authorIds) &&
        ticket.authorIds.length > 0
      )
        changes.push('Authors');
      if (ticket.categoryId && ticket.categoryId > 0) changes.push('Category');
      if (ticket.subCategoryId && ticket.subCategoryId > 0)
        changes.push('Subcategory');
      if (ticket.tradeCategoryId && ticket.tradeCategoryId > 0)
        changes.push('Trade Category');
      if (ticket.genreId && ticket.genreId > 0) changes.push('Genre');
      if (ticket.publishingType && ticket.publishingType.trim())
        changes.push('Publishing Type');
      if (ticket.printingOnly !== undefined && ticket.printingOnly !== null)
        changes.push('Printing Only');

      return {
        id: ticket.id,
        title: ticket.title?.name || 'N/A',
        publisher:
          ticket.title?.publisher?.name ||
          ticket.title?.publisherDisplay ||
          'N/A',
        requestedBy:
          ticket.user?.firstName && ticket.user?.lastName
            ? `${ticket.user.firstName} ${ticket.user.lastName}`
            : ticket.user?.email || 'N/A',
        changes: changes.length > 0 ? changes.length : 0,
        changesList: changes,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.titleUpdateDataSource.data = mapped;
  }

  private mapPrintingUpdateTickets(): void {
    const mapped = this.printingUpdateTickets().map((ticket) => {
      const changes: string[] = [];

      // Only add fields that have actual values
      if (ticket.bindingTypeId && ticket.bindingTypeId > 0)
        changes.push('Binding Type');
      if (
        ticket.colorPages !== undefined &&
        ticket.colorPages !== null &&
        ticket.colorPages >= 0
      )
        changes.push('Color Pages');
      if (
        ticket.isColorPagesRandom !== undefined &&
        ticket.isColorPagesRandom !== null
      )
        changes.push('Color Pages Random');
      if (ticket.insideCover !== undefined && ticket.insideCover !== null)
        changes.push('Inside Cover');
      if (ticket.laminationTypeId && ticket.laminationTypeId > 0)
        changes.push('Lamination Type');
      if (ticket.paperType && ticket.paperType.trim())
        changes.push('Paper Type');
      if (ticket.paperQuailtyId && ticket.paperQuailtyId > 0)
        changes.push('Paper Quality');
      if (ticket.sizeCategoryId && ticket.sizeCategoryId > 0)
        changes.push('Size Category');
      if (
        ticket.customPrintCost !== undefined &&
        ticket.customPrintCost !== null &&
        ticket.customPrintCost >= 0
      )
        changes.push('Custom Print Cost');
      if (
        ticket.customDeliveryCharges !== undefined &&
        ticket.customDeliveryCharges !== null &&
        ticket.customDeliveryCharges >= 0
      )
        changes.push('Custom Delivery Charges');

      return {
        id: ticket.id,
        title: ticket.title?.name || 'N/A',
        publisher:
          ticket.title?.publisher?.name ||
          ticket.title?.publisherDisplay ||
          'N/A',
        requestedBy:
          ticket.user?.firstName && ticket.user?.lastName
            ? `${ticket.user.firstName} ${ticket.user.lastName}`
            : ticket.user?.email || 'N/A',
        changes: changes.length > 0 ? changes.length : 0,
        changesList: changes,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.printingUpdateDataSource.data = mapped;
  }

  private mapPricingUpdateTickets(): void {
    const mapped = this.pricingUpdateTickets().map((ticket) => {
      const platforms =
        ticket.data && Array.isArray(ticket.data)
          ? ticket.data
              .map((p) => {
                // Convert platformId to platform name for display
                if (p.platformId) {
                  const platform = this.platformService
                    .platforms()
                    .find((pl) => pl.id === p.platformId);
                  return platform?.name || `Platform ${p.platformId}`;
                }
                return null;
              })
              .filter(Boolean)
              .join(', ')
          : 'N/A';

      return {
        id: ticket.id,
        title: ticket.title?.name || 'N/A',
        publisher:
          ticket.title?.publisher?.name ||
          ticket.title?.publisherDisplay ||
          'N/A',
        requestedBy:
          ticket.user?.firstName && ticket.user?.lastName
            ? `${ticket.user.firstName} ${ticket.user.lastName}`
            : ticket.user?.email || 'N/A',
        platforms: platforms,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.pricingUpdateDataSource.data = mapped;
  }

  private mapRoyaltyUpdateTickets(): void {
    const mapped = this.royaltyUpdateTickets().map((ticket) => {
      const royaltiesCount =
        ticket.data && Array.isArray(ticket.data) ? ticket.data.length : 0;

      return {
        id: ticket.id,
        title: ticket.title?.name || 'N/A',
        publisher:
          ticket.title?.publisher?.name ||
          ticket.title?.publisherDisplay ||
          'N/A',
        requestedBy:
          ticket.user?.firstName && ticket.user?.lastName
            ? `${ticket.user.firstName} ${ticket.user.lastName}`
            : ticket.user?.email || 'N/A',
        royaltiesCount: `${royaltiesCount} ${
          royaltiesCount === 1 ? 'royalty' : 'royalties'
        }`,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.royaltyUpdateDataSource.data = mapped;
  }

  private mapMediaUpdateTickets(): void {
    const mapped = this.mediaUpdateTickets().map((ticket) => {
      const getMediaTypeLabel = (type: string): string => {
        switch (type) {
          case 'FRONT_COVER':
            return 'Front Cover';
          case 'BACK_COVER':
            return 'Back Cover';
          case 'MANUSCRIPT':
            return 'Manuscript';
          case 'FULL_COVER':
            return 'Full Cover';
          case 'INTERIOR':
            return 'Interior';
          case 'INSIDE_COVER':
            return 'Inside Cover';
          default:
            return type;
        }
      };

      return {
        id: ticket.id,
        title: ticket.title?.name || 'N/A',
        publisher:
          ticket.title?.publisher?.name ||
          ticket.title?.publisherDisplay ||
          'N/A',
        requestedBy:
          ticket.user?.firstName && ticket.user?.lastName
            ? `${ticket.user.firstName} ${ticket.user.lastName}`
            : ticket.user?.email || 'N/A',
        mediaType: getMediaTypeLabel(ticket.type),
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.mediaUpdateDataSource.data = mapped;
  }

  private mapDistributionUpdateTickets(): void {
    const mapped = this.distributionUpdateTickets().map((ticket) => {
      const distributions =
        ticket.distributions && Array.isArray(ticket.distributions)
          ? ticket.distributions
              .map((d) => this.translateService.instant(d) || d)
              .join(', ')
          : 'N/A';

      return {
        id: ticket.id,
        title: ticket.title?.name || 'N/A',
        publisher:
          ticket.title?.publisher?.name ||
          ticket.title?.publisherDisplay ||
          'N/A',
        requestedBy:
          ticket.user?.firstName && ticket.user?.lastName
            ? `${ticket.user.firstName} ${ticket.user.lastName}`
            : ticket.user?.email || 'N/A',
        distributions: distributions,
        status: ticket.status,
        createdAt: ticket.createdAt
          ? format(new Date(ticket.createdAt), 'dd-MM-yyyy HH:mm')
          : 'N/A',
        actions: '',
        ticket,
      };
    });
    this.distributionUpdateDataSource.data = mapped;
  }

  async onApproveTitleUpdateTicket(ticket: TitleUpdateTicket): Promise<void> {
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
      await this.titleService.approveTitleUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketapproved') ||
          'Ticket approved successfully.',
      });
      this.resetTabFilter(0);
      this.fetchedTabs.delete(0);
      this.fetchTitleUpdateTickets();
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

  async onRejectTitleUpdateTicket(ticket: TitleUpdateTicket): Promise<void> {
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
      await this.titleService.rejectTitleUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketrejected') ||
          'Ticket rejected successfully.',
      });
      this.resetTabFilter(0);
      this.fetchedTabs.delete(0);
      this.fetchTitleUpdateTickets();
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

  async onApprovePrintingUpdateTicket(
    ticket: TitlePrintingUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.approveTitlePrintingUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketapproved') ||
          'Ticket approved successfully.',
      });
      this.resetTabFilter(1);
      this.fetchedTabs.delete(1);
      this.fetchPrintingUpdateTickets();
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

  async onRejectPrintingUpdateTicket(
    ticket: TitlePrintingUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.rejectTitlePrintingUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketrejected') ||
          'Ticket rejected successfully.',
      });
      this.resetTabFilter(1);
      this.fetchedTabs.delete(1);
      this.fetchPrintingUpdateTickets();
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

  async onApprovePricingUpdateTicket(
    ticket: PricingUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.approvePricingUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketapproved') ||
          'Ticket approved successfully.',
      });
      this.resetTabFilter(2);
      this.fetchedTabs.delete(2);
      this.fetchPricingUpdateTickets();
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

  async onRejectPricingUpdateTicket(
    ticket: PricingUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.rejectPricingUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketrejected') ||
          'Ticket rejected successfully.',
      });
      this.resetTabFilter(2);
      this.fetchedTabs.delete(2);
      this.fetchPricingUpdateTickets();
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

  async onApproveRoyaltyUpdateTicket(
    ticket: RoyaltyUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.approveRoyaltyUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketapproved') ||
          'Ticket approved successfully.',
      });
      this.resetTabFilter(3);
      this.fetchedTabs.delete(3);
      this.fetchRoyaltyUpdateTickets();
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

  async onRejectRoyaltyUpdateTicket(
    ticket: RoyaltyUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.rejectRoyaltyUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketrejected') ||
          'Ticket rejected successfully.',
      });
      this.resetTabFilter(3);
      this.fetchedTabs.delete(3);
      this.fetchRoyaltyUpdateTickets();
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

  async onApproveMediaUpdateTicket(
    ticket: TitleMediaUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.approveTitleMediaUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketapproved') ||
          'Ticket approved successfully.',
      });
      this.resetTabFilter(4);
      this.fetchedTabs.delete(4);
      this.fetchMediaUpdateTickets();
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

  async onRejectMediaUpdateTicket(
    ticket: TitleMediaUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.rejectTitleMediaUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketrejected') ||
          'Ticket rejected successfully.',
      });
      this.resetTabFilter(4);
      this.fetchedTabs.delete(4);
      this.fetchMediaUpdateTickets();
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

  async onApproveDistributionUpdateTicket(
    ticket: TitleDistributionUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.approveTitleDistributionUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketapproved') ||
          'Ticket approved successfully.',
      });
      this.resetTabFilter(5);
      this.fetchedTabs.delete(5);
      this.fetchDistributionUpdateTickets();
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

  async onRejectDistributionUpdateTicket(
    ticket: TitleDistributionUpdateTicket,
  ): Promise<void> {
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
      await this.titleService.rejectTitleDistributionUpdateTicket(ticket.id);
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('ticketrejected') ||
          'Ticket rejected successfully.',
      });
      this.resetTabFilter(5);
      this.fetchedTabs.delete(5);
      this.fetchDistributionUpdateTickets();
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

  onViewTicket(ticket: any): void {
    const tabIndex = this.selectedTabIndex();
    let ticketType:
      | 'title'
      | 'printing'
      | 'pricing'
      | 'royalty'
      | 'media'
      | 'distribution';

    switch (tabIndex) {
      case 0:
        ticketType = 'title';
        break;
      case 1:
        ticketType = 'printing';
        break;
      case 2:
        ticketType = 'pricing';
        break;
      case 3:
        ticketType = 'royalty';
        break;
      case 4:
        ticketType = 'media';
        break;
      case 5:
        ticketType = 'distribution';
        break;
      default:
        ticketType = 'title';
    }

    this.dialog.open(ViewTicketDialog, {
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      data: {
        ticket: ticket.ticket,
        ticketType: ticketType,
      },
    });
  }
}
