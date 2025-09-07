import { Component, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { PublisherService } from '../publisher/publisher-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { Back } from '../../components/back/back';
import { Title } from '../../interfaces/Titles';
import { Author } from '../../interfaces/Authors';
import { Publishers } from '../../interfaces/Publishers';
import { Royalty } from '../../interfaces/Royalty';
import { Wallet } from '../../interfaces/Wallet';
import { AuthorsService } from '../authors/authors-service';
import { TitleService } from '../titles/title-service';
import {MatTabsModule} from '@angular/material/tabs';
import { MatFormField } from '@angular/material/form-field';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MatInputModule} from '@angular/material/input';
import { RoyaltyService } from '../../services/royalty-service';
@Component({
  selector: 'app-publisher-details',
  imports: [SharedModule, Back ,MatTabsModule, MatFormField , MatTableModule, MatInputModule],
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
  completeAddress= computed(()=> this.publisherDetails()?.address?.map((address) => {
    return `${address.address}, ${address.city}, ${address.state}, ${address.country}, ${address.pincode}`;
  }).join(' | '));
  
  authors = signal<Author[]>([]);
  subPublishers = signal<Publishers[]>([]);
  royalties = signal<Royalty[]>([]);
  wallet = signal<Wallet | null>(null);
  publishedLinks = signal<any[]>([]);
  attachments = signal<any[]>([]);

  displayedColumns: string[] = ['serial', 'bookname', 'ISBN', 'Pages', 'royaltiesearned','authorname', 'links'];
  displayedAuthorColumns: string[] = ['serial', 'name', 'email', 'phonenumber', 'titles', 'royaltyearned', 'links'];
  displayedSubPublisherColumns: string[] = ['serial', 'name', 'email', 'phonenumber', 'titles', 'authors', 'companyname'];
  displayedRoyaltyColumns: string[] = ['serial','date', 'authorname', 'booktitle', 'sales','royaltyfromsales', 'publisherearnings', 'royaltyamount' ];
  bookPublishData = new MatTableDataSource<Title>(this.booksPublished());
  authorData = new MatTableDataSource<Author>(this.authors());
  subPublisherData = new MatTableDataSource<Publishers>(this.subPublishers());
  royaltyData = new MatTableDataSource<Royalty>(this.royalties());
  ngOnInit(): void {
    // Fetch publisher details using the publisherId
    this.fetchPublisherDetails();
    this.fetchSubPublishers()
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
    try {
      const { items } = await this.publisherService.getPublishers({
        parentPublisherId: this.publisherId,
      });
      this.subPublishers.set(items as Publishers[])
      this.subPublisherData.data = items as Publishers[];
    } catch (error) {
      console.error('Error fetching sub publisher:', error);
    }
  }

  async fetchAuthors() {
    try {
      const { items } = await this.authorsService.getAuthors({
        publisherId: this.publisherId,
      });
      this.authors.set(items as Author[]);
      this.authorData.data = items as Author[];
    } catch (error) {
      throw error;
    }
  }

  async fetchTitles() {
    try {
      const { items } = await this.titleService.getTitles({
        publisherId: this.publisherId,
      });
      this.booksPublished.set(items as Title[]);
      this.bookPublishData.data = items as Title[];
    } catch (error) {
      throw error;   
    }
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
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}
applyFilter(event: Event) {
  const filterValue = (event.target as HTMLInputElement).value;
  this.bookPublishData.filter = filterValue.trim().toLowerCase();
}

applyAuhtorFilter(event: Event) {
  const filterValue = (event.target as HTMLInputElement).value;
  this.authorData.filter = filterValue.trim().toLowerCase();
}
applySubPublisherFilter(event: Event) {
  const filterValue = (event.target as HTMLInputElement).value;
  this.subPublisherData.filter = filterValue.trim().toLowerCase();
}

  
}
