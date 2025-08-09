import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { PublisherService } from '../publisher/publisher-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { Back } from '../../components/back/back';
import { Books } from '../../interfaces/Books';
import { Author } from '../../interfaces/Authors';
import { Publishers } from '../../interfaces/Publishers';
import { Royalty } from '../../interfaces/Royalty';
import { Wallet } from '../../interfaces/Wallet';
@Component({
  selector: 'app-publisher-details',
  imports: [SharedModule,Back],
  templateUrl: './publisher-details.html',
  styleUrl: './publisher-details.css',
})
export class PublisherDetails {
  constructor(
    private route: ActivatedRoute,
    private publisherService: PublisherService
  ) {
    this.route.params.subscribe(({ id }) => {
      this.publisherId.set(id);
      console.log('Publisher ID:', id);
    });
  }

  publisherId = signal<number>(0);
  publisherDetails = signal<Publishers | null>(null);
  booksPublished = signal<Books[]>([]);
  authors = signal<Author[]>([]);
  subPublishers = signal<Publishers[]>([]);
  royalties = signal<Royalty[]>([]);
  wallet = signal<Wallet | null>(null);
  publishedLinks = signal<any[]>([])  ;
  attachments = signal<any[]>([]);  

  ngOnInit(): void {
    // Fetch publisher details using the publisherId
    this.fetchPublisherDetails();
  }

  async fetchPublisherDetails() {
    try {
    const response =  await this.publisherService.getPublisherById(this.publisherId());
    this.publisherDetails.set(response as Publishers);
    } catch (error) {
      console.error('Error fetching publisher details:', error);
    }
  }
}
