import { Component, computed, signal } from '@angular/core';
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
  Publishers,
  Royalty,
  TitleDistribution,
} from '../../interfaces';
import { Title } from '@angular/platform-browser';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { formatCurrency } from '@angular/common';
import { format } from 'date-fns';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ListTable } from '../../components/list-table/list-table';
import { MatInputModule } from '@angular/material/input';
import { PublisherService } from '../publisher/publisher-service';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
import { formatIsbn } from 'src/app/shared/utils/isbn.utils';

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
    SafeUrlPipe,
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
    private publisherService: PublisherService
  ) {
    this.route.params.subscribe(({ id }) => {
      this.authorId = id;
    });
  }

  authorId!: number;
  authorDetails = signal<Author | null>(null);
  booksPublished = signal<Title[]>([]);
  completeAddress = computed(() =>
    this.authorDetails()
      ?.address?.map((address) => {
        return `${address.address}, ${address.city}, ${address.state}, ${address.country}, ${address.pincode}`;
      })
      .join(' | ')
  );

  authors = signal<Author[]>([]);
  subPublishers = signal<Publishers[]>([]);
  royalties = signal<Royalty[]>([]);
  distributions = signal<TitleDistribution[]>([]);
  attachments = signal<any[]>([]);
  authorFilter = signal({ page: 1 });
  displayedColumns: string[] = [
    'serial',
    'title',
    'isbnPrint',
    'isbnEbook',
    'pages',
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
  displayedPublisherColumns: string[] = [
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
  PublisherData = new MatTableDataSource<any>([]);
  royaltyData = new MatTableDataSource<Royalty>();
  async ngOnInit() {
    await this.fetchauthorDetails();
    await this.fetchPublishers();
    await this.fetchTitles();
    await this.fetchRoyalty();
    await this.fetchDistributionLinks();
    this.PublisherData.filterPredicate = (data: any, filter: string) => {
      const search = filter.trim().toLowerCase();

      return (
        (data.name ?? '').toLowerCase().includes(search) ||
        (data.email ?? '').toLowerCase().includes(search) ||
        (data.phonenumber ?? '').toLowerCase().includes(search)
      );
    };
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

  async fetchPublishers() {
    this.publisherService
      .getPublishers({ authorIds: this.authorId })
      .then(({ items }) => {
        const mapped = items.map((publisher) => ({
          ...publisher,
          phonenumber:
            publisher.phoneNumber || publisher.user?.phoneNumber || 'N/A',
          nooftitles: publisher.noOfTitles,
          noofauthors: publisher.noOfAuthors,
        }));

        // ✅ IMPORTANT
        this.PublisherData.data = mapped;
      })
      .catch((error) => console.error('Error fetching publishers:', error));
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
    this.titleService
      .getTitles({ authorIds: [this.authorId] })
      .then(({ items }) => {
        const mapped = items.map((title, idx) => ({
          serial: idx + 1,
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

        // ✅ IMPORTANT
        this.bookPublishData.data = mapped;
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }

  async fetchRoyalty() {
    const { items } = await this.salesService.fetchEarnings({
      authorIds: [this.authorId],
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
      authorIds: this.authorId,
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
    this.bookPublishData.filter = filterValue.trim().toLowerCase();
  }
  applyAuthorFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.authorData.filter = value;
  }
  applyPublisherFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.PublisherData.filter = filterValue.trim().toLowerCase();
  }
  applyRoyaltyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.royaltyData.filter = value.trim().toLowerCase();
  }
}
