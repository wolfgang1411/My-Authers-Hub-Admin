import { ChangeDetectionStrategy, Component, ElementRef, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { debounceTime, Subject } from 'rxjs';
import { Publishers } from '../../interfaces/Publishers';
import { PublisherService } from './publisher-service';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-publisher',
  imports: [SharedModule , RouterLink , CommonModule],
  templateUrl: './publisher.html',
  styleUrl: './publisher.css',
  changeDetection:ChangeDetectionStrategy.OnPush

})
export class Publisher implements OnInit{
  constructor(private publisherService: PublisherService) {
  }
searchStr = new Subject<string>()

test!:Subject<string>;
publishers = signal<Publishers[]>([]);


ngOnInit(): void {
 this.searchStr.pipe((debounceTime(400))
 ).subscribe((value) => {
   console.log('Search string:', value);
 });  

  this.publisherService.getPublishers().then(({items}) => {
    this.publishers.set(items);
    console.log('Fetched publishers:', this.publishers());
  }).catch((error) => {
    console.error('Error fetching publishers:', error);
  });
}

scrollToContent(element : ElementRef)
{

}

}
