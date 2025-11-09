import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Back } from '../../components/back/back';
import { TitleService } from '../titles/title-service';
import { Title, TitleFilter } from '../../interfaces';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-title-details',
  imports: [
    MatProgressBarModule,
    MatIconModule,
    Back,
    UpperCasePipe,
    MatButtonModule,
  ],
  templateUrl: './title-details.html',
  styleUrl: './title-details.css',
})
export class TitleDetails {
  constructor(private titleService: TitleService) {}
  titles = signal<Title[]>([]);
  filter: TitleFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
  };
  ngOnInit(): void {
    this.fetchTitleList();
  }

  fetchTitleList() {
    this.titleService
      .getTitles()
      .then(({ items }) => {
        const sorted = items.sort((a, b) => {
          const order = ['DRAFT', 'PENDING', 'APPROVED'];
          return order.indexOf(a.status) - order.indexOf(b.status);
        });
        this.titles.set(sorted);
        console.log('Fetched & sorted titles:', this.titles());
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }
  draftTitles = computed(() =>
    this.titles().filter((t) => t.status === 'DRAFT' || t.status === 'PENDING')
  );
  publishedTitles = computed(() =>
    this.titles().filter((t) => t.status !== 'DRAFT' && t.status !== 'PENDING')
  );
  deleteTitle(titleId: number) {}
}
