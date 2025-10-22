import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { Title, TitleFilter } from '../../interfaces';

@Component({
  selector: 'app-recent-titles',
  imports: [DecimalPipe, SharedModule],
  templateUrl: './recent-titles.html',
  styleUrl: './recent-titles.css',
})
export class RecentTitles {
  list: Title[] = [];
  constructor(private svc: DashboardService) {}
  titleFilter: TitleFilter = {};
  async ngOnInit() {
    this.titleFilter = {
      publishedAfter: '',
    };
    const TitleResponse = await this.svc.getRecentTitles(this.titleFilter);
    this.list = TitleResponse;
  }
}
