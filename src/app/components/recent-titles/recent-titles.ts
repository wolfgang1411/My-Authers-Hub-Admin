import { DecimalPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { Title, TitleFilter, TitleStatus } from '../../interfaces';
import { TitleService } from '../../pages/titles/title-service';
import { formatDate, subDays } from 'date-fns';

@Component({
  selector: 'app-recent-titles',
  imports: [SharedModule],
  templateUrl: './recent-titles.html',
  styleUrl: './recent-titles.css',
})
export class RecentTitles {
  constructor(private titleService: TitleService) {}

  titles = signal<Title[] | null>(null);
  titleFilter: TitleFilter = {
    publishedAfter: formatDate(subDays(new Date(), 30), 'yyyy-MM-dd'),
    status: TitleStatus.APPROVED,
  };

  async ngOnInit() {
    this.fetchAndUpdateTitles();
  }

  async fetchAndUpdateTitles() {
    const { items } = await this.titleService.getTitles(this.titleFilter);
    this.titles.update((t) => (t ? [...t, ...items] : items));
  }
}
