import { Component, computed, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
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
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';
import { StaticValuesService } from '../../services/static-values';
import { MatButtonModule } from '@angular/material/button';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
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
  ],
  templateUrl: './publisher-details.html',
  styleUrl: './publisher-details.css',
})
export class PublisherDetails {
  constructor(
    private route: ActivatedRoute,
    private publisherService: PublisherService,
    private authorsService: AuthorsService,
    private titleService: TitleService,
    private salesService: SalesService,
    private translateService: TranslateService,
    public staticValueService: StaticValuesService
  ) {
    this.route.params.subscribe(({ id }) => {
      this.publisherId = id;
    });
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
  async buyPoints(type: DistributionType) {
    try {
      const res = await this.publisherService.buyPublishingPoints(
        type,
        2,
        '',
        this.publisherId
      );
      if (res) {
        Swal.fire({
          icon: 'success',
          title: 'Requested',
          text: 'Purchase request has been sent to admin for approval',
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  async fetchSubPublishers() {
    this.publisherService
      .getPublishers({ parentPublisherId: this.publisherId })
      .then(({ items }) => {
        const mapped = items.map((publisher) => ({
          ...publisher,
          phonenumber: publisher.phoneNumber || publisher.user.phoneNumber,
          nooftitles: publisher.noOfTitles,
          noofauthors: publisher.noOfAuthors,
        }));
        this.subPublisherData = new MatTableDataSource(mapped);
        this.subPublisherData.filterPredicate = (data, filter) =>
          data.name.toLowerCase().includes(filter) ||
          data.email.toLowerCase().includes(filter) ||
          data.phonenumber?.toLowerCase().includes(filter);
      })
      .catch((error) => console.error('Error fetching authors:', error));
  }
  fetchAuthors() {
    this.authorsService
      .getAuthors({ publisherId: this.publisherId, showTotalEarnings: true })
      .then(({ items }) => {
        const mapped = items.map((author, idx) => ({
          ...author,
          serial: idx + 1,
          name: `${author.user.firstName} ${author.user.lastName}`,
          email: author.user.email,
          phonenumber: author.user.phoneNumber,
          titles: author.noOfTitles,
          bookssold: author.booksSold,
          royaltyearned: author.totalEarning || 0,
          links: author.socialMedias?.map((sm) => sm.url) || 'N/A',
        }));
        this.authorData = new MatTableDataSource(mapped);

        this.authorData.filterPredicate = (data, filter) =>
          data.name.toLowerCase().includes(filter) ||
          data.email.toLowerCase().includes(filter) ||
          data.phonenumber?.toLowerCase().includes(filter);
      })
      .catch((error) => console.error('Error fetching authors:', error));
  }

  async fetchTitles() {
    this.titleService
      .getTitles()
      .then(({ items }) => {
        const mapped = items.map((title, idx) => ({
          serial: idx + 1,
          id: title.id,
          title: title.name,
          distribution: title.distribution,
          isbnPrint:
            title.isbnPrint && title.isbnPrint ? title.isbnPrint : 'N/A',
          isbnEbook:
            title.isbnEbook && title.isbnEbook ? title.isbnEbook : 'N/A',
          pages:
            title.printing && title.printing.length
              ? title.printing[0].totalPages
              : 'N/A',

          copiessold: title.copiesSold,
          royaltiesearned: title.totalSales,
          authors:
            title.authors && title.authors.length
              ? title.authors.map(({ display_name }) => display_name).join(' ,')
              : 'N/A',
          status: title.status,
        }));
        this.bookPublishData = new MatTableDataSource(mapped);
        this.bookPublishData.filterPredicate = (data, filter) =>
          data.title.toLowerCase().includes(filter) ||
          data.distribution.toLowerCase().includes(filter) ||
          data.isbnPrint.toLowerCase().includes(filter) ||
          data.isbnEbook.toLowerCase().includes(filter);
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
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
        earning.royalty.author?.user.firstName,
      amount: formatCurrency(earning.amount, 'en', '', 'INR'),
      platform: this.translateService.instant(earning.platform),
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
  }
  applyAuthorFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.authorData.filter = value;
  }
  applySubPublisherFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.subPublisherData.filter = filterValue.trim().toLowerCase();
  }
}
