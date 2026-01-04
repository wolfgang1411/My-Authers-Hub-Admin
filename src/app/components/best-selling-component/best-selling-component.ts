import { Component, input, signal } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { DecimalPipe } from '@angular/common';
import { TitleService } from '../../pages/titles/title-service';
import { Title, TitleFilter } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { MyDatePipe } from '../../pipes/my-date-pipe';

@Component({
  selector: 'app-title-preview-component',
  imports: [SharedModule, MyDatePipe],
  templateUrl: './best-selling-component.html',
  styleUrl: './best-selling-component.css',
})
export class TitlePreviewComponent {
  constructor(private titleService: TitleService) {}

  heading = input.required<string>();
  filter = input.required<TitleFilter>();
  type = input.required<string>();

  titles = signal<Title[] | null>(null);

  ngOnInit() {
    this.fetchAndUpdateTitles();
  }

  async fetchAndUpdateTitles() {
    const { items } = await this.titleService.getTitles({
      ...this.filter(),
      itemsPerPage: this.filter()?.itemsPerPage || 5,
    });
    this.titles.update((titles) =>
      titles && titles.length ? [...titles, ...items] : items
    );
  }
}
