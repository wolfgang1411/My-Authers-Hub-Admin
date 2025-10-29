import { Component, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { PublisherService } from '../publisher/publisher-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { Back } from '../../components/back/back';
import { Title } from '../../interfaces/Titles';
import { Author, AuthorFilter } from '../../interfaces/Authors';
import { Publishers } from '../../interfaces/Publishers';
import { Royalty } from '../../interfaces/Royalty';
import { Wallet } from '../../interfaces/Wallet';
import { AuthorsService } from '../authors/authors-service';
import { TitleService } from '../titles/title-service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormField } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { RoyaltyService } from '../../services/royalty-service';
import { ListTable } from '../../components/list-table/list-table';
import { DetailsListTable } from '../../components/details-list-table/details-list-table';
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
    private royaltyService: RoyaltyService
  ) {
    this.route.params.subscribe(({ id }) => {
      this.publisherId = id;
    });
  }

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
  wallet = signal<Wallet | null>(null);
  publishedLinks = signal<any[]>([]);
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
    'links',
  ];
  displayedSubPublisherColumns: string[] = [
    'name',
    'nooftitles',
    'noofauthors',
    'email',
    'phonenumber',
  ];
  displayedRoyaltyColumns: string[] = [
    'serial',
    'date',
    'authorname',
    'booktitle',
    'sales',
    'royaltyfromsales',
    'publisherearnings',
    'royaltyamount',
  ];
  bookPublishData = new MatTableDataSource<any>([]);
  authorData = new MatTableDataSource<any>([]);
  subPublisherData = new MatTableDataSource<any>([]);
  royaltyData = new MatTableDataSource<Royalty>(this.royalties());
  ngOnInit(): void {
    this.fetchPublisherDetails();
    this.fetchSubPublishers();
    this.fetchAuthors();
    this.fetchTitles();
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
      .getAuthors({ publisherId: this.publisherId })
      .then(({ items }) => {
        const mapped = items.map((author, idx) => ({
          ...author,
          serial: idx + 1,
          name: `${author.user.firstName} ${author.user.lastName}`,
          email: author.user.email,
          phonenumber: author.user.phoneNumber,
          titles: author.noOfTitles,
          booksSold: author.booksSold,
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

          royaltiesearned: 0,

          authors:
            title.authors && title.authors.length
              ? title.authors.map((author) => author.author?.name).join(' ,')
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
    // try {
    //   const { items } = await this.royaltyService.getRoyalties({
    //     publisherId: this.publisherId,
    //   });
    //   this.royalties.set(items as Royalty[]);
    //   this.royaltyData.data = items as Royalty[];
    // } catch (error) {
    //   throw error;
    // }
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
  applySubPublisherFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.subPublisherData.filter = filterValue.trim().toLowerCase();
  }
}
