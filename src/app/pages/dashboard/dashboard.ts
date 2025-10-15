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
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  constructor(private svc: DashboardService) {}
  stats: any[] = [];
  toggleTheme() {
    document.documentElement.classList.toggle('dark');
  }
  ngOnInit() {
    this.svc.getStats().subscribe((s) => (this.stats = s));
  }
}
