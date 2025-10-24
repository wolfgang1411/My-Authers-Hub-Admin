import { Component, signal } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { DecimalPipe } from '@angular/common';
import { TitleService } from '../../pages/titles/title-service';
import { Title, TitleFilter } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-best-selling-component',
  imports: [SharedModule],
  templateUrl: './best-selling-component.html',
  styleUrl: './best-selling-component.css',
})
export class BestSellingComponent {
  constructor(private titleService: TitleService) {}

  titles = signal<Title[] | null>(null);
  filter: TitleFilter = {
    bestSellingMAH: true,
    itemsPerPage: 10,
  };

  ngOnInit() {
    this.fetchAndUpdateTitles();
  }

  async fetchAndUpdateTitles() {
    const { items } = await this.titleService.getTitles(this.filter);
    this.titles.update((titles) =>
      titles && titles.length ? [...titles, ...items] : items
    );
  }
}
