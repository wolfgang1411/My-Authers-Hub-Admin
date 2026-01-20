import {
  Component,
  computed,
  effect,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PublisherService } from '../publisher/publisher-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { Back } from '../../components/back/back';
import { Title, TitleFilter } from '../../interfaces/Titles';
import { EarningFilter } from '../../interfaces';
import { Author, AuthorFilter } from '../../interfaces/Authors';
import {
  Publishers,
  PublishingPoints,
  PublisherFilter,
} from '../../interfaces/Publishers';
import { Royalty } from '../../interfaces/Royalty';
import { Wallet } from '../../interfaces/Wallet';
import { AuthorsService } from '../authors/authors-service';
import { TitleService } from '../titles/title-service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormField } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { ListTable } from '../../components/list-table/list-table';
import { SalesService } from '../../services/sales';
import { formatCurrency } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { DistributionType } from '../../interfaces';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StaticValuesService } from '../../services/static-values';
import { MatButtonModule } from '@angular/material/button';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
import { BuyAssignPointsButton } from '../../components/buy-assign-points-button/buy-assign-points-button';
import { formatIsbn } from 'src/app/shared/utils/isbn.utils';
import { UserService } from 'src/app/services/user';
import { MobileSection } from 'src/app/components/mobile-section/mobile-section';
@Component({
  selector: 'app-publisher-details',
  imports: [
    SharedModule,
    Back,
    MatTabsModule,
    MatFormField,
    MatTableModule,
    MatInputModule,
    ListTable,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    SafeUrlPipe,
    BuyAssignPointsButton,
    MobileSection,
  ],
  templateUrl: './publisher-details.html',
  styleUrl: './publisher-details.css',
})
export class PublisherDetails implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  selectedTabIndex = signal<number>(0);
  private readonly userService = inject(UserService);

  loggedInUser = computed(() => this.userService.loggedInUser$());
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publisherService: PublisherService,
    private authorsService: AuthorsService,
    private titleService: TitleService,
    private salesService: SalesService,
    private translateService: TranslateService,
    public staticValueService: StaticValuesService,
  ) {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(({ id }) => {
      this.publisherId = id;
    });

    // Read tab index from query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const tabIndex = params['tab'];
        if (tabIndex !== undefined) {
          const index = Number(tabIndex);
          if (!isNaN(index) && index >= 0) {
            this.selectedTabIndex.set(index);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  distributionType = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.DistributionType || {},
    ) as DistributionType[];
  });

  publisherId!: number;
  publisherDetails = signal<Publishers | null>(null);
  booksPublished = signal<Title[]>([]);
  completeAddress = computed(() =>
    this.publisherDetails()
      ?.address?.map((address) => {
        return `${address.address}, ${address.city}, ${address.state}, ${address.country}, ${address.pincode}`;
      })
      .join(' | '),
  );

  authors = signal<Author[]>([]);
  subPublishers = signal<Publishers[]>([]);
  royalties = signal<Royalty[]>([]);
  publishedLinks = signal<
    Array<{
      titleName: string;
      links: Array<{ platformName: string; link: string }>;
    }>
  >([]);
  attachments = signal<any[]>([]);
  publishingpoints = signal<PublishingPoints[]>([]);

  // Authors Pagination
  authorsFilter = signal<AuthorFilter>({
    page: 1,
    itemsPerPage: 30,
    publisherIds: [],
    showTotalEarnings: true,
    orderBy: 'id',
    orderVal: 'desc',
  });
  authorsLastPage = signal(1);

  // Sub-Publishers Pagination
  subPublishersFilter = signal<PublisherFilter>({
    page: 1,
    itemsPerPage: 30,
    parentPublisherId: undefined,
    orderBy: 'id',
    orderByVal: 'desc',
  });
  subPublishersLastPage = signal(1);

  // Books Published Pagination
  booksFilter = signal<TitleFilter>({
    page: 1,
    itemsPerPage: 30,
    publisherIds: [],
    orderBy: 'id',
    orderByVal: 'desc',
  });
  booksLastPage = signal(1);

  // Royalty Pagination
  royaltyFilter = signal<EarningFilter>({
    page: 1,
    itemsPerPage: 30,
    publisherIds: [],
    orderBy: 'id',
    orderByVal: 'desc',
  });
  royaltyLastPage = signal(1);

  // Published Links Pagination
  publishedLinksFilter = signal<any>({
    page: 1,
    itemsPerPage: 30,
    publisherIds: [],
    orderBy: 'titleName',
    orderByVal: 'desc',
    searchStr: '',
  });
  publishedLinksLastPage = signal(1);
  publishedLinksData = new MatTableDataSource<any>([]);
  displayedPublishedLinksColumns: string[] = ['title', 'actions'];

  displayedColumns: string[] = [
    'serial',
    'title',
    'isbnPrint',
    'isbnEbook',
    'pages',
    'copiessold',
    'royaltiesearned',
    'authors',
  ];
  displayedAuthorColumns: string[] = [
    'serial',
    'name',
    'email',
    'phonenumber',
    'titles',
    'bookssold',
    'wallet',
  ];
  displayedSubPublisherColumns: string[] = [
    'name',
    'nooftitles',
    'noofauthors',
    'email',
    'phonenumber',
    'wallet',
  ];
  displayedRoyaltyColumns = signal([
    'title',
    'publisher/author',
    'amount',
    'platform',
    'paidAt/holduntill',
  ]);
  bookPublishData = new MatTableDataSource<any>([]);
  authorData = new MatTableDataSource<any>([]);
  subPublisherData = new MatTableDataSource<any>([]);
  royaltyData = new MatTableDataSource<Royalty>();

  // Sorting functions for books
  booksGetApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      title: 'name',
      isbnPrint: 'isbnPrint',
      isbnEbook: 'isbnEbook',
      royaltiesearned: 'totalSales',
      copiessold: 'copiesSold',
    };
    return columnMap[column] || null;
  };

  booksIsSortable = (column: string): boolean => {
    return this.booksGetApiFieldName(column) !== null;
  };

  booksOnSortChange(sort: { active: string; direction: 'asc' | 'desc' | '' }) {
    const apiFieldName = this.booksGetApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.booksFilter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.fetchTitles();
  }

  // Sorting functions for royalty
  royaltyGetApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      title: 'title.name',
      amount: 'amount',
      platform: 'platform.name',
      'paidAt/holduntill': 'paidAt',
    };
    return columnMap[column] || null;
  };

  royaltyIsSortable = (column: string): boolean => {
    return this.royaltyGetApiFieldName(column) !== null;
  };

  royaltyOnSortChange(sort: {
    active: string;
    direction: 'asc' | 'desc' | '';
  }) {
    const apiFieldName = this.royaltyGetApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.royaltyFilter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.fetchRoyalty();
  }

  // Sorting functions for authors
  authorsGetApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'fullName',
      titles: 'TitleAuthor',
      bookssold: 'sales',
      wallet: 'wallet',
    };
    return columnMap[column] || null;
  };

  authorsIsSortable = (column: string): boolean => {
    return this.authorsGetApiFieldName(column) !== null;
  };

  authorsOnSortChange(sort: {
    active: string;
    direction: 'asc' | 'desc' | '';
  }) {
    const apiFieldName = this.authorsGetApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.authorsFilter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderVal: direction,
      page: 1,
    }));
    this.fetchAuthors();
  }

  // Sorting functions for sub-publishers
  subPublishersGetApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      name: 'name',
      nooftitles: 'noOfTitles',
      noofauthors: 'noOfAuthors',
      wallet: 'wallet',
    };
    return columnMap[column] || null;
  };

  subPublishersIsSortable = (column: string): boolean => {
    return this.subPublishersGetApiFieldName(column) !== null;
  };

  subPublishersOnSortChange(sort: {
    active: string;
    direction: 'asc' | 'desc' | '';
  }) {
    const apiFieldName = this.subPublishersGetApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.subPublishersFilter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.fetchSubPublishers();
  }
  pointsMap = computed(() => {
    const map: Record<string, PublishingPoints> = {};
    this.publishingpoints()?.forEach((p) => {
      map[p.distributionType] = p;
    });
    return map;
  });

  async ngOnInit() {
    await this.fetchPublisherDetails();
    this.authorsFilter.update((f) => ({
      ...f,
      publisherIds: [this.publisherId],
    }));
    this.subPublishersFilter.update((f) => ({
      ...f,
      parentPublisherId: this.publisherId,
    }));
    this.booksFilter.update((f) => ({
      ...f,
      publisherIds: [this.publisherId],
    }));
    this.royaltyFilter.update((f) => ({
      ...f,
      publisherIds: [this.publisherId],
    }));
    this.publishedLinksFilter.update((f) => ({
      ...f,
      publisherIds: [this.publisherId],
    }));
    await this.fetchSubPublishers();
    await this.fetchAuthors();
    await this.fetchTitles();
    await this.fetchRoyalty();
    await this.fetchPublishedLinks();
    await this.fetchPublishingPoints();
    this.bookPublishData.filterPredicate = (data: any, filter: string) => {
      const search = filter.trim().toLowerCase();

      return (
        (data.title ?? '').toLowerCase().includes(search) ||
        (data.distribution ?? '').toLowerCase().includes(search) ||
        (data.isbnPrint ?? '').toLowerCase().includes(search) ||
        (data.isbnEbook ?? '').toLowerCase().includes(search) ||
        (data.authors ?? '').toLowerCase().includes(search)
      );
    };
    this.authorData.filterPredicate = (data: any, filter: string) => {
      const search = filter.trim().toLowerCase();

      return (
        (data.name ?? '').toLowerCase().includes(search) ||
        (data.email ?? '').toLowerCase().includes(search) ||
        (data.phonenumber ?? '').toLowerCase().includes(search) ||
        (data.links ?? '').toLowerCase().includes(search)
      );
    };
    this.subPublisherData.filterPredicate = (data: any, filter: string) => {
      const search = filter.trim().toLowerCase();

      return (
        (data.name ?? '').toLowerCase().includes(search) ||
        (data.email ?? '').toLowerCase().includes(search) ||
        (data.phonenumber ?? '').toLowerCase().includes(search)
      );
    };
    this.royaltyData.filterPredicate = (data: any, filter: string) => {
      const search = filter.trim().toLowerCase();

      return (
        (data.title ?? '').toLowerCase().includes(search) ||
        (data['publisher/author'] ?? '').toLowerCase().includes(search) ||
        (data.platform ?? '').toLowerCase().includes(search) ||
        (data.amount ?? '').toString().toLowerCase().includes(search) ||
        (data['paidAt/holduntill'] ?? '').toLowerCase().includes(search)
      );
    };
  }

  async fetchPublisherDetails() {
    try {
      const response = await this.publisherService.getPublisherById(
        this.publisherId,
      );
      this.publisherDetails.set(response as Publishers);
    } catch (error) {
      console.error('Error fetching publisher details:', error);
    }
  }
  async fetchPublishingPoints() {
    try {
      const { items: response } =
        await this.publisherService.fetchPublishingPoints(this.publisherId);
      this.publishingpoints.set(response as PublishingPoints[]);
    } catch (error) {
      console.error('Error fetching publisher details:', error);
    }
  }
  async onPointsPurchased() {
    await this.fetchPublishingPoints();
  }

  async fetchSubPublishers() {
    try {
      const filter = this.subPublishersFilter();
      const { items, totalCount, itemsPerPage } =
        await this.publisherService.getPublishers(filter);

      const mapped = items.map((publisher) => ({
        ...publisher,
        phonenumber:
          publisher.phoneNumber || publisher.user?.phoneNumber || 'N/A',
        wallet: Math.round(publisher?.user?.wallet?.totalAmount || 0) || 0,
        nooftitles: publisher.noOfTitles,
        noofauthors: publisher.noOfAuthors,
      }));

      this.subPublisherData.data = mapped;
      this.subPublishersLastPage.set(Math.ceil(totalCount / itemsPerPage));
    } catch (error) {
      console.error('Error fetching sub publishers:', error);
    }
  }

  subPublishersNextPage() {
    const currentPage = this.subPublishersFilter().page || 1;
    if (currentPage < this.subPublishersLastPage()) {
      this.subPublishersFilter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchSubPublishers();
    }
  }

  subPublishersPreviousPage() {
    const currentPage = this.subPublishersFilter().page || 1;
    if (currentPage > 1) {
      this.subPublishersFilter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchSubPublishers();
    }
  }

  subPublishersOnItemsPerPageChange(itemsPerPage: number) {
    this.subPublishersFilter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.fetchSubPublishers();
  }

  subPublishersGetPageNumbers(): number[] {
    const currentPage = this.subPublishersFilter().page || 1;
    const totalPages = this.subPublishersLastPage();
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

  subPublishersGoToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.subPublishersLastPage()) {
      this.subPublishersFilter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchSubPublishers();
    }
  }

  async fetchAuthors() {
    try {
      const filter = this.authorsFilter();
      const { items, totalCount, itemsPerPage } =
        await this.authorsService.getAuthors(filter);

      const mapped = items.map((author, idx) => ({
        ...author,
        serial: ((filter.page || 1) - 1) * itemsPerPage + idx + 1,
        name: `${author.user.firstName} ${author.user.lastName}`,
        email: author.user.email,
        phonenumber: author.user.phoneNumber ?? 'N/A',
        titles: author.noOfTitles,
        bookssold: author.booksSold,
        wallet:
          (author.user.wallet?.totalAmount || 0) -
          (author.user.wallet?.holdAmount || 0),
        links: author.socialMedias?.length
          ? author.socialMedias.map((sm) => sm.url).join(', ')
          : 'N/A',
      }));

      this.authorData.data = mapped;
      this.authorsLastPage.set(Math.ceil(totalCount / itemsPerPage));
    } catch (error) {
      console.error('Error fetching authors:', error);
    }
  }

  authorsNextPage() {
    const currentPage = this.authorsFilter().page || 1;
    if (currentPage < this.authorsLastPage()) {
      this.authorsFilter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchAuthors();
    }
  }

  authorsPreviousPage() {
    const currentPage = this.authorsFilter().page || 1;
    if (currentPage > 1) {
      this.authorsFilter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchAuthors();
    }
  }

  authorsOnItemsPerPageChange(itemsPerPage: number) {
    this.authorsFilter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.fetchAuthors();
  }

  authorsGetPageNumbers(): number[] {
    const currentPage = this.authorsFilter().page || 1;
    const totalPages = this.authorsLastPage();
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

  authorsGoToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.authorsLastPage()) {
      this.authorsFilter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchAuthors();
    }
  }

  async fetchTitles() {
    try {
      const filter = this.booksFilter();
      const { items, totalCount, itemsPerPage } =
        await this.titleService.getTitles(filter);

      const mapped = items.map((title, idx) => ({
        serial: ((filter.page || 1) - 1) * itemsPerPage + idx + 1,
        id: title.id,
        title: title.name,

        // ✅ FIXED DISTRIBUTION
        distribution: title.distribution?.length
          ? title.distribution.map((d) => d.type).join(', ')
          : 'N/A',

        isbnPrint: title.isbnPrint ? formatIsbn(title.isbnPrint) : 'N/A',
        isbnEbook: title.isbnEbook ? formatIsbn(title.isbnEbook) : 'N/A',

        pages: title.printing?.[0]?.totalPages ?? 'N/A',
        copiessold: title.copiesSold,
        royaltiesearned: title.totalSales,

        authors: title.authors?.length
          ? title.authors.map((a) => a.display_name).join(', ')
          : 'N/A',

        status: title.status,
      }));

      this.bookPublishData.data = mapped;
      this.booksLastPage.set(Math.ceil(totalCount / itemsPerPage));
    } catch (error) {
      console.error('Error fetching titles:', error);
    }
  }

  booksNextPage() {
    const currentPage = this.booksFilter().page || 1;
    if (currentPage < this.booksLastPage()) {
      this.booksFilter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchTitles();
    }
  }

  booksPreviousPage() {
    const currentPage = this.booksFilter().page || 1;
    if (currentPage > 1) {
      this.booksFilter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchTitles();
    }
  }

  booksOnItemsPerPageChange(itemsPerPage: number) {
    this.booksFilter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.fetchTitles();
  }

  booksGetPageNumbers(): number[] {
    const currentPage = this.booksFilter().page || 1;
    const totalPages = this.booksLastPage();
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

  booksGoToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.booksLastPage()) {
      this.booksFilter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchTitles();
    }
  }

  async fetchRoyalty() {
    try {
      const filter = this.royaltyFilter();
      const { items, totalCount, itemsPerPage } =
        await this.salesService.fetchEarnings(filter);

      const mappedData = items?.map((earning) => ({
        ...earning,
        title: earning.royalty.title.name,
        'publisher/author':
          earning.royalty.publisher?.name ||
          earning.royalty.author?.user.firstName ||
          'N/A',
        amount: formatCurrency(earning.amount, 'en', '', 'INR'),
        platform:
          earning.platformName ||
          this.translateService.instant(earning.platform.name),
        'paidAt/holduntill': (() => {
          const date = earning.holdUntil || earning.paidAt;
          if (!date) return '-';
          return format(date, 'dd-MM-yyyy');
        })(),
      }));

      this.royaltyData.data = mappedData as any;
      this.royaltyLastPage.set(Math.ceil(totalCount / itemsPerPage));
    } catch (error) {
      console.error('Error fetching royalty:', error);
    }
  }

  royaltyNextPage() {
    const currentPage = this.royaltyFilter().page || 1;
    if (currentPage < this.royaltyLastPage()) {
      this.royaltyFilter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchRoyalty();
    }
  }

  royaltyPreviousPage() {
    const currentPage = this.royaltyFilter().page || 1;
    if (currentPage > 1) {
      this.royaltyFilter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchRoyalty();
    }
  }

  royaltyOnItemsPerPageChange(itemsPerPage: number) {
    this.royaltyFilter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.fetchRoyalty();
  }

  royaltyGetPageNumbers(): number[] {
    const currentPage = this.royaltyFilter().page || 1;
    const totalPages = this.royaltyLastPage();
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

  royaltyGoToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.royaltyLastPage()) {
      this.royaltyFilter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchRoyalty();
    }
  }

  async fetchPublishedLinks() {
    try {
      const filter = this.publishedLinksFilter();
      const { items, totalCount, itemsPerPage } =
        await this.titleService.fetchTitlePlatformLinks({
          page: filter.page || 1,
          itemsPerPage: filter.itemsPerPage || 30,
          publisherIds: [this.publisherId],
          orderBy: filter.orderBy,
          orderByVal: filter.orderByVal,
          searchStr: filter.searchStr,
        });

      this.publishedLinks.set(items);
      this.publishedLinksLastPage.set(Math.ceil(totalCount / itemsPerPage));

      // Map items to dataSource format
      const mappedData = items.map((item) => ({
        title: item.titleName,
        links: item.links,
      }));
      this.publishedLinksData.data = mappedData;
    } catch (error) {
      console.error('Error fetching published links:', error);
    }
  }

  publishedLinksNextPage() {
    const currentPage = this.publishedLinksFilter().page || 1;
    if (currentPage < this.publishedLinksLastPage()) {
      this.publishedLinksFilter.update((f) => ({
        ...f,
        page: currentPage + 1,
      }));
      this.fetchPublishedLinks();
    }
  }

  publishedLinksPreviousPage() {
    const currentPage = this.publishedLinksFilter().page || 1;
    if (currentPage > 1) {
      this.publishedLinksFilter.update((f) => ({
        ...f,
        page: currentPage - 1,
      }));
      this.fetchPublishedLinks();
    }
  }

  publishedLinksOnItemsPerPageChange(itemsPerPage: number) {
    this.publishedLinksFilter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.fetchPublishedLinks();
  }

  publishedLinksGetPageNumbers(): number[] {
    const currentPage = this.publishedLinksFilter().page || 1;
    const totalPages = this.publishedLinksLastPage();
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

  publishedLinksGoToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.publishedLinksLastPage()) {
      this.publishedLinksFilter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchPublishedLinks();
    }
  }

  onPublishedLinksSearch(value: string) {
    this.publishedLinksFilter.update((f) => ({
      ...f,
      searchStr: value,
      page: 1,
    }));
    this.fetchPublishedLinks();
  }

  // Sorting functions for published links
  publishedLinksGetApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      title: 'titleName',
    };
    return columnMap[column] || null;
  };

  publishedLinksIsSortable = (column: string): boolean => {
    return this.publishedLinksGetApiFieldName(column) !== null;
  };

  publishedLinksOnSortChange(sort: {
    active: string;
    direction: 'asc' | 'desc' | '';
  }) {
    const apiFieldName = this.publishedLinksGetApiFieldName(sort.active);
    if (!apiFieldName) return;

    const direction: 'asc' | 'desc' =
      sort.direction === 'asc' || sort.direction === 'desc'
        ? sort.direction
        : 'desc';

    this.publishedLinksFilter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
      page: 1,
    }));
    this.fetchPublishedLinks();
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 200;
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    console.log(filterValue, 'filterrrr');
    this.bookPublishData.filter = filterValue.trim().toLowerCase();

    console.log('FILTER VALUE:', this.bookPublishData.filter);
    console.log('FILTERED DATA:', this.bookPublishData.filteredData);
  }
  applyAuthorFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.authorData.filter = value.trim().toLowerCase();
  }

  applySubPublisherFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.subPublisherData.filter = filterValue.trim().toLowerCase();
  }
  applyRoyaltyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.royaltyData.filter = value.trim().toLowerCase();
  }

  returnUrl(): string {
    const url = `publisherDetails/${this.publisherId}?tab=5`;
    return url.toString();
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    this.updateTabInQueryParams(index);
  }

  private updateTabInQueryParams(tabIndex: number): void {
    const currentParams = { ...this.route.snapshot.queryParams };

    if (tabIndex === 0) {
      // Remove tab param if it's the first tab (default)
      delete currentParams['tab'];
    } else {
      currentParams['tab'] = tabIndex.toString();
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
      queryParamsHandling: 'merge',
      replaceUrl: true, // Don't add to history
    });
  }

  getPlatformIconUrl(platformName?: string): string | null {
    // Use jsdelivr CDN for Simple Icons (real brand icons)
    const name = (platformName || '').toUpperCase();
    if (name === 'AMAZON' || name === 'AMAZON_PRIME') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazon.svg';
    } else if (name === 'FLIPKART') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/flipkart.svg';
    } else if (name === 'KINDLE') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazon.svg';
    } else if (name === 'GOOGLE_PLAY' || name === 'GOOGLEPLAY') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googleplay.svg';
    } else if (
      name === 'APPLE_BOOKS' ||
      name === 'APPLEBOOKS' ||
      name === 'IBOOKS'
    ) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apple.svg';
    } else if (name === 'KOBO') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/kobo.svg';
    } else if (name === 'BARNES_NOBLE' || name === 'BARNESANDNOBLE') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/barnesandnoble.svg';
    } else if (name === 'SMASHWORDS') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/smashwords.svg';
    } else if (name === 'KOBO_WRITING_LIFE') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/kobo.svg';
    } else {
      return null;
    }
  }

  hasPlatformIconUrl(platformName?: string): boolean {
    return !!this.getPlatformIconUrl(platformName);
  }

  getPlatformIcon(platformName?: string): string {
    // Fallback Material icon if no brand icon available
    const name = (platformName || '').toUpperCase();
    if (name === 'MAH_PRINT' || name === 'MAH_EBOOK') {
      return 'store';
    }
    return 'link';
  }
}
