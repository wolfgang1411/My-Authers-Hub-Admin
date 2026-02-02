import { Component, computed, Signal, signal } from '@angular/core';
import { Back } from '../../components/back/back';
import { MatTabGroup, MatTab, MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../modules/shared/shared-module';
import { ActivatedRoute } from '@angular/router';
import { AuthorsService } from '../authors/authors-service';
import { TitleService } from '../titles/title-service';
import { SalesService } from '../../services/sales';
import { TranslateService } from '@ngx-translate/core';
import {
  Author,
  Royalty,
  Title,
  TitleFilter,
  EarningFilter,
  User,
} from '../../interfaces';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { formatCurrency } from '@angular/common';
import { format } from 'date-fns';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ListTable } from '../../components/list-table/list-table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
import { formatIsbn } from 'src/app/shared/utils/isbn.utils';
import { MobileSection } from 'src/app/components/mobile-section/mobile-section';
import { Earnings } from 'src/app/interfaces/Earnings';
import { UserService } from '../../services/user';
import { MatDialog } from '@angular/material/dialog';
import { AddWalletAmount } from 'src/app/components/add-wallet-amount/add-wallet-amount';
import { WalletService } from 'src/app/services/wallet';
import Swal from 'sweetalert2';
import {
  AddWalletAmountButton,
  AddWalletAmountButtonResposne,
} from 'src/app/components/add-wallet-amount-button/add-wallet-amount-button';

@Component({
  selector: 'app-author-details',
  imports: [
    Back,
    MatTabsModule,
    MatTableModule,
    SharedModule,
    MatFormFieldModule,
    ListTable,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SafeUrlPipe,
    MobileSection,
    AddWalletAmountButton,
  ],
  templateUrl: './author-details.html',
  styleUrl: './author-details.css',
})
export class AuthorDetails {
  constructor(
    private route: ActivatedRoute,
    private authorsService: AuthorsService,
    private titleService: TitleService,
    private salesService: SalesService,
    private translateService: TranslateService,
    private userService: UserService,
    private readonly matDialog: MatDialog,
    private readonly walletService: WalletService,
  ) {
    this.loggedInUser = userService.loggedInUser$;
    this.route.params.subscribe(({ id }) => {
      this.authorId = id;
    });
  }

  loggedInUser!: Signal<User | null>;
  authorId!: number;
  authorDetails = signal<Author | null>(null);
  booksPublished = signal<Title[]>([]);
  completeAddress = computed(() =>
    this.authorDetails()
      ?.address?.map((address) => {
        return `${address.address}, ${address.city}, ${address.state}, ${address.country}, ${address.pincode}`;
      })
      .join(' | '),
  );

  authors = signal<Author[]>([]);
  royalties = signal<Royalty[]>([]);
  publishedLinks = signal<
    Array<{
      titleName: string;
      links: Array<{ platformName: string; link: string }>;
    }>
  >([]);
  attachments = signal<any[]>([]);

  // Books Published Pagination
  booksFilter = signal<TitleFilter>({
    page: 1,
    itemsPerPage: 30,
    authorIds: [],
    orderBy: 'id',
    orderByVal: 'desc',
  });
  booksLastPage = signal(1);

  // Royalty Pagination
  royaltyFilter = signal<EarningFilter>({
    page: 1,
    itemsPerPage: 30,
    authorIds: [],
    orderBy: 'id',
    orderByVal: 'desc',
  });
  royaltyLastPage = signal(1);

  // Published Links Pagination
  publishedLinksFilter = signal<any>({
    page: 1,
    itemsPerPage: 30,
    authorIds: [],
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
    'royaltiesearned',
    'authors',
  ];

  onWalletAmountTransactionFinish(data: AddWalletAmountButtonResposne) {
    const { amount, status } = data;
    if (status === 'completed') {
      const authorDetails = this.authorDetails();
      if (authorDetails) {
        const finalAmount =
          (authorDetails.user.wallet?.totalAmount || 0) + amount;
        this.authorDetails.update(() => {
          if (authorDetails.user && authorDetails.user.wallet) {
            authorDetails['user']['wallet']['totalAmount'] = finalAmount;
          }
          return authorDetails;
        });
      }

      const loggedInUser = this.loggedInUser();
      if (
        loggedInUser &&
        loggedInUser.accessLevel == 'PUBLISHER' &&
        loggedInUser.wallet &&
        data.method === 'WALLET'
      ) {
        const updatedAmount =
          loggedInUser['wallet']['totalAmount'] - data.amount;
        loggedInUser['wallet']['totalAmount'] = updatedAmount;
        this.userService.setLoggedInUser(loggedInUser);
      }
    }
  }

  // Sorting functions for books
  booksGetApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      title: 'name',
      isbnPrint: 'isbnPrint',
      isbnEbook: 'isbnEbook',
      royaltiesearned: 'totalSales',
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
  displayedAuthorColumns: string[] = [
    'serial',
    'name',
    'email',
    'phonenumber',
    'titles',
    'bookssold',
    'royaltyearned',
  ];
  displayedRoyaltyColumns = signal([
    'transactionId',
    'title',
    'publisher/author',
    'amount',
    'platform',
    'paidAt/holduntill',
  ]);
  bookPublishData = new MatTableDataSource<any>([]);
  authorData = new MatTableDataSource<any>([]);
  royaltyData = new MatTableDataSource<Royalty>();
  rawRoyalties = signal<Earnings[]>([]);
  async ngOnInit() {
    await this.fetchauthorDetails();
    this.booksFilter.update((f) => ({ ...f, authorIds: [this.authorId] }));
    this.royaltyFilter.update((f) => ({ ...f, authorIds: [this.authorId] }));
    this.publishedLinksFilter.update((f) => ({
      ...f,
      authorIds: [this.authorId],
    }));
    await this.fetchTitles();
    await this.fetchRoyalty();
    await this.fetchPublishedLinks();
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

  async fetchauthorDetails() {
    try {
      const response = await this.authorsService.getAuthorrById(this.authorId);
      this.authorDetails.set(response as Author);
    } catch (error) {
      console.error('Error fetching publisher details:', error);
    }
  }

  // fetchAuthors() {
  //   this.authorsService
  //     .getAuthors({ publisherId: this.publisherId, showTotalEarnings: true })
  //     .then(({ items }) => {
  //       const mapped = items.map((author, idx) => ({
  //         ...author,
  //         serial: idx + 1,
  //         name: `${author.user.firstName} ${author.user.lastName}`,
  //         email: author.user.email,
  //         phonenumber: author.user.phoneNumber,
  //         titles: author.noOfTitles,
  //         bookssold: author.booksSold,
  //         royaltyearned: author.totalEarning || 0,
  //         links: author.socialMedias?.map((sm) => sm.url) || 'N/A',
  //       }));
  //       this.authorData = new MatTableDataSource(mapped);

  //       this.authorData.filterPredicate = (data, filter) =>
  //         data.name.toLowerCase().includes(filter) ||
  //         data.email.toLowerCase().includes(filter) ||
  //         data.phonenumber?.toLowerCase().includes(filter);
  //     })
  //     .catch((error) => console.error('Error fetching authors:', error));
  // }

  async fetchTitles() {
    try {
      const filter = this.booksFilter();
      const { items, totalCount, itemsPerPage } =
        await this.titleService.getTitles(filter);

      const mapped = items.map((title, idx) => ({
        serial: ((filter.page || 1) - 1) * itemsPerPage + idx + 1,
        id: title.id,
        title: title.name,

        distribution: title.distribution?.length
          ? title.distribution.map((d) => d.type).join(', ')
          : 'N/A',

        isbnPrint: title.isbnPrint ? formatIsbn(title.isbnPrint) : 'N/A',
        isbnEbook: title.isbnEbook ? formatIsbn(title.isbnEbook) : 'N/A',

        pages: title.printing?.[0]?.totalPages ?? 'N/A',
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
      this.rawRoyalties.set(items);
      const mappedData = items?.map((earning) => ({
        ...earning,
        transactionId: '#RO' + earning.id,
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
          authorIds: [this.authorId],
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
  private bookSearchTimeout?: any;

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.bookPublishData.filter = value;
    if (!value) {
      this.booksFilter.update((f) => ({
        ...f,
        searchStr: undefined,
        page: 1,
      }));
      this.fetchTitles();
      return;
    }
    if (this.bookPublishData.filteredData.length > 0) {
      return;
    }
    clearTimeout(this.bookSearchTimeout);
    this.bookSearchTimeout = setTimeout(() => {
      this.booksFilter.update((f) => ({
        ...f,
        searchStr: value,
        page: 1,
      }));
      this.fetchTitles();
    }, 400);
  }
  private royaltySearchTimeout?: any;

  applyRoyaltyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();

    this.royaltyData.filter = value;

    if (!value) {
      this.royaltyFilter.update((f) => ({
        ...f,
        searchStr: undefined,
        page: 1,
      }));
      this.fetchRoyalty();
      return;
    }

    if (this.royaltyData.filteredData.length > 0) {
      return;
    }

    clearTimeout(this.royaltySearchTimeout);
    this.royaltySearchTimeout = setTimeout(() => {
      this.royaltyFilter.update((f) => ({
        ...f,
        searchStr: value,
        page: 1,
      }));
      this.fetchRoyalty();
    }, 400);
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
