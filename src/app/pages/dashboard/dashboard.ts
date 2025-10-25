import { Component, signal } from '@angular/core';
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
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from '@angular/material/datepicker';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { formatDate } from 'date-fns';
import { TitleService } from '../titles/title-service';
import { AuthorsService } from '../authors/authors-service';
import { SalesService } from '../../services/sales';
import { UserService } from '../../services/user';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-dashboard',
  imports: [
    NgChartsModule,
    StatCardComponent,
    SalesAnalyticsComponent,
    BestSellingComponent,
    ActivityTimelineComponent,
    RecentOrdersComponent,
    RecentAuthors,
    FormsModule,
    MatInputModule,
    ReactiveFormsModule,
    SharedModule,
    ProfileCardComponent,
  ],

  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  constructor(
    private svc: DashboardService,
    private titleService: TitleService,
    private authorService: AuthorsService,
    private salesService: SalesService,
    private userService: UserService
  ) {}

  date = new FormControl(formatDate(new Date(), 'yyyy-MM-dd'));

  stats = signal<{}[] | null>(null);

  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }

  ngOnInit() {
    this.fetchStats();
  }

  async fetchStats() {
    const totalTitles = await this.titleService.getTitleCount({});
    const totalAuthors = await this.authorService.getAuthorsCount({});
    const totalSales = await this.salesService.fetchSalesCount({});
    const totalSalesUser = await this.salesService.fetchSalesCount({
      userId: this.userService.loggedInUser$()?.id,
    });

    this.stats.set([
      { title: 'Total titles', value: totalTitles.count || 0 },
      { title: 'Total Authors', value: totalAuthors.count || 0 },
      { title: 'Total Copies sold', value: totalSales.copiesSold || 0 },
      {
        title: 'Total Royalty',
        value: totalSales.totalAmount || 0,
        isCurreny: true,
      },
      {
        title: 'Total Earnings',
        value: totalSalesUser.totalAmount || 0,
        isCurreny: true,
      },
    ]);
  }
}
