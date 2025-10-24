import { Component } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { StatCardComponent } from '../../components/stat-card-component/stat-card-component';
import { SalesAnalyticsComponent } from '../../components/sales-analytics-component/sales-analytics-component';
import { BestSellingComponent } from '../../components/best-selling-component/best-selling-component';
import { BrowserUsageComponent } from '../../components/browser-usage-component/browser-usage-component';
import { ActivityTimelineComponent } from '../../components/activity-timeline-component/activity-timeline-component';
import { ProfileCardComponent } from '../../components/profile-card-component/profile-card-component';
import { RecentOrdersComponent } from '../../components/recent-orders-component/recent-orders-component';
import { DashboardService } from '../../services/dashboard-service';
import { RecentAuthors } from '../../components/recent-authors/recent-authors';
import { RecentTitles } from '../../components/recent-titles/recent-titles';
import { MatDatepicker } from '@angular/material/datepicker';
import {
  MatDatepickerToggle,
  MatDatepickerInput,
} from '@angular/material/datepicker';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import moment from 'moment';
import { MatInputModule } from '@angular/material/input';
import { Author, AuthorFilter, Title, TitleFilter } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { AuthorsService } from '../authors/authors-service';

@Component({
  selector: 'app-dashboard',
  imports: [
    NgChartsModule,
    StatCardComponent,
    SalesAnalyticsComponent,
    BestSellingComponent,
    BrowserUsageComponent,
    ActivityTimelineComponent,
    ProfileCardComponent,
    RecentOrdersComponent,
    RecentAuthors,
    RecentTitles,
    MatDatepicker,
    MatDatepickerToggle,
    MatDatepickerInput,
    FormsModule,
    MatInputModule,
    ReactiveFormsModule,
    SharedModule,
  ],

  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  constructor(
    private svc: DashboardService,
    private authorService: AuthorsService
  ) {}
  stats: any[] = [];
  date = new FormControl(moment());
  list: Title[] = [];
  authorList: Author[] = [];
  titleFilter: TitleFilter = {};
  authorFilter: AuthorFilter = {};
  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }
  async ngOnInit() {
    this.svc.getStats().subscribe((s) => (this.stats = s));
    this.getRecentTitles();
    this.getRecentAuthors();
  }
  onDateSelected(event: any) {
    const selectedDate = event.value?.toDate?.() ?? event.value;
    if (selectedDate) {
      this.getRecentTitles(selectedDate);
    }
  }
  async getRecentTitles(publishedAfter?: Date) {
    if (publishedAfter) {
      this.titleFilter = {
        publishedAfter: publishedAfter as Date,
      };
    }
    const { items: TitleResponse } = await this.svc.getRecentTitles(
      this.titleFilter
    );
    this.list = TitleResponse;
  }
  async getRecentAuthors(approvedAfter?: Date) {
    if (approvedAfter) {
      this.authorFilter = {
        approvedAfter: approvedAfter as Date,
      };
    }
    const { items: AuthorResponse } = await this.authorService.getAuthors(
      this.authorFilter
    );
    this.authorList = AuthorResponse;
  }
}
