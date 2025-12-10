import { Component, signal } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { StatCardComponent } from '../../components/stat-card-component/stat-card-component';
import { SalesAnalyticsComponent } from '../../components/sales-analytics-component/sales-analytics-component';
import { TitlePreviewComponent } from '../../components/best-selling-component/best-selling-component';
import { ActivityTimelineComponent } from '../../components/activity-timeline-component/activity-timeline-component';
import { ProfileCardComponent } from '../../components/profile-card-component/profile-card-component';
import { RecentOrdersComponent } from '../../components/recent-orders-component/recent-orders-component';
import { DashboardService } from '../../services/dashboard-service';
import { RecentAuthors } from '../../components/recent-authors/recent-authors';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { formatDate, subDays } from 'date-fns';
import { TitleService } from '../titles/title-service';
import { AuthorsService } from '../authors/authors-service';
import { SalesService } from '../../services/sales';
import { UserService } from '../../services/user';
import { SharedModule } from '../../modules/shared/shared-module';
import { EarningsStatus, ISBNStatus, TitleStatus } from '../../interfaces';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { IsbnService } from 'src/app/services/isbn-service';
import { PayoutsService } from 'src/app/services/payouts';
import { PayoutStatus } from '../../interfaces/Payout';

@Component({
  selector: 'app-dashboard',
  imports: [
    TitlePreviewComponent,
    NgChartsModule,
    StatCardComponent,
    SalesAnalyticsComponent,
    ActivityTimelineComponent,
    RecentOrdersComponent,
    RecentAuthors,
    FormsModule,
    MatInputModule,
    ReactiveFormsModule,
    SharedModule,
    ProfileCardComponent,
    MatIconModule,
    MatButtonModule,
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
    public userService: UserService,
    private router: Router,
    private payoutService: PayoutsService,
    private isbnService: IsbnService
  ) {}

  date = new FormControl(formatDate(new Date(), 'yyyy-MM-dd'));

  stats = signal<{}[] | null>(null);
  pendingTitles = signal(0);
  royaltyPending = signal(0);
  isbnApplied = signal(0);

  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }

  titleConfigs = signal({
    bestSelling: {
      heading: 'Best Selling Books',
      filter: {
        bestSellingMAH: true,
        status: TitleStatus.APPROVED,
      },
      type: 'BEST_SELLING_MAH',
    },
    recent: {
      heading: 'Recent Books',
      filter: {
        publishedAfter: subDays(new Date(), 30).toISOString(),
        status: TitleStatus.APPROVED,
      },
      type: 'RECENT',
    },
  });

  ngOnInit() {
    this.fetchStats();
    this.fetchNotificationCounts();
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
  async fetchNotificationCounts() {
    // 1. Pending Titles
    const pending = await this.titleService.getTitleCount({
      status: TitleStatus.PENDING,
    });
    this.pendingTitles.set(pending.count || 0);

    const pendingearining = await this.payoutService.getPayoutrequestCount({
      status: 'PENDING',
    });
    this.royaltyPending.set(pendingearining.count || 0);

    const appliedisbn = await this.isbnService.getISBNCount({
      status: ISBNStatus.APPLIED,
      page: 0,
      itemsPerPage: 0,
      searchStr: '',
    });
    this.isbnApplied.set(appliedisbn.count || 0);
  }
  goToPendingTitles() {
    this.router.navigate(['/titles'], {
      queryParams: { status: 'PENDING' },
    });
  }

  goToRoyaltyApproval() {
    this.router.navigate(['/payouts'], {
      queryParams: { status: 'PENDING' },
    });
  }

  goToIsbnApplied() {
    this.router.navigate(['/isbn'], {
      queryParams: { status: 'APPLIED' },
    });
  }
}
