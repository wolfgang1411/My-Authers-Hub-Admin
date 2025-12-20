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
import { Title, TitleDistribution } from '../../interfaces/Titles';
import { Author } from '../../interfaces/Authors';
import { Publishers, PublishingPoints } from '../../interfaces/Publishers';
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
import { StaticValuesService } from '../../services/static-values';
import { MatButtonModule } from '@angular/material/button';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
import { BuyAssignPointsButton } from '../../components/buy-assign-points-button/buy-assign-points-button';
import { formatIsbn } from 'src/app/shared/utils/isbn.utils';
import { UserService } from 'src/app/services/user';
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
    SafeUrlPipe,
    BuyAssignPointsButton,
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
    public staticValueService: StaticValuesService
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
      this.staticValueService.staticValues()?.DistributionType || {}
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
      .join(' | ')
  );

  authors = signal<Author[]>([]);
  subPublishers = signal<Publishers[]>([]);
  royalties = signal<Royalty[]>([]);
  // publishedLinks = signal<any[]>([]);
  distributions = signal<TitleDistribution[]>([]);
  attachments = signal<any[]>([]);
  publishingpoints = signal<PublishingPoints[]>([]);
  authorFilter = signal({ page: 1 });
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
    'royaltyearned',
  ];
  displayedSubPublisherColumns: string[] = [
    'name',
    'nooftitles',
    'noofauthors',
    'email',
    'phonenumber',
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
  pointsMap = computed(() => {
    const map: Record<string, PublishingPoints> = {};
    this.publishingpoints()?.forEach((p) => {
      map[p.distributionType] = p;
    });
    return map;
  });

  async ngOnInit() {
    await this.fetchPublisherDetails();
    await this.fetchSubPublishers();
    await this.fetchAuthors();
    await this.fetchTitles();
    await this.fetchRoyalty();
    await this.fetchDistributionLinks();
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
        this.publisherId
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
    this.publisherService
      .getPublishers({ parentPublisherId: this.publisherId })
      .then(({ items }) => {
        const mapped = items.map((publisher) => ({
          ...publisher,
          phonenumber:
            publisher.phoneNumber || publisher.user?.phoneNumber || 'N/A',
          nooftitles: publisher.noOfTitles,
          noofauthors: publisher.noOfAuthors,
        }));

        // ✅ IMPORTANT
        this.subPublisherData.data = mapped;
      })
      .catch((error) => console.error('Error fetching sub publishers:', error));
  }

  fetchAuthors() {
    this.authorsService
      .getAuthors({
        publisherIds: [this.publisherId],
        showTotalEarnings: true,
      })
      .then(({ items }) => {
        const mapped = items.map((author, idx) => ({
          ...author,
          serial: idx + 1,
          name: `${author.user.firstName} ${author.user.lastName}`,
          email: author.user.email,
          phonenumber: author.user.phoneNumber ?? 'N/A',
          titles: author.noOfTitles,
          bookssold: author.booksSold,
          royaltyearned: author.totalEarning || 0,
          links: author.socialMedias?.length
            ? author.socialMedias.map((sm) => sm.url).join(', ')
            : 'N/A',
        }));

        this.authorData.data = mapped;
      })
      .catch((error) => console.error('Error fetching authors:', error));
  }

  async fetchTitles() {
    try {
      const { items } = await this.titleService.getTitles({
        publisherIds: [this.publisherId],
      });

      const mapped = items.map((title, idx) => ({
        serial: idx + 1,
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
    } catch (error) {
      console.error('Error fetching titles:', error);
    }
  }

  async fetchRoyalty() {
    const { items } = await this.salesService.fetchEarnings({
      publisherIds: [this.publisherId],
    });

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
  }

  async fetchDistributionLinks() {
    const { items } = await this.titleService.fetchTitleDistribution({
      itemsPerPage: 100,
      publisherIds: this.publisherId,
    });
    this.distributions.set(items);
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
}
