import { Component, OnInit, signal } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { DashboardService } from '../../services/dashboard-service';
import { DashbordStateType, Platform } from '../../interfaces';
import { MatRadioModule } from '@angular/material/radio';
import { BehaviorSubject } from 'rxjs';
import { PlatformService } from 'src/app/services/platform';

@Component({
  selector: 'app-sales-analytics-component',
  templateUrl: './sales-analytics-component.html',
  styleUrls: ['./sales-analytics-component.css'],
  imports: [NgChartsModule, MatRadioModule],
})
export class SalesAnalyticsComponent implements OnInit {
  constructor(
    private svc: DashboardService,
    private platformService: PlatformService
  ) {}

  salesDuration = new BehaviorSubject<DashbordStateType>('WEEKLY');
  labels = signal<string[]>([]);
  chartData = signal<ChartConfiguration<'line'>['data']>({
    datasets: [],
    labels: [],
  });
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { point: { radius: 3 } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#ceb8ef' } },
    },
    plugins: {
      legend: { position: 'top' },
    },
  };
  lineType: any = 'line';
  platforms = signal<Platform[]>([]);

  async fetchAndUpdateStates(type: DashbordStateType = 'MONTHLY') {
    try {
      const res = (await this.svc.getStatsTemp(type)) as Record<string, any>[];

      if (!res || res.length === 0) {
        console.warn('⚠ No sales data');
        return;
      }
      const labels = res.map((item) => Object.keys(item)[0]);
      this.labels.set(labels);
      const platformList = this.platforms();
      if (!platformList || platformList.length === 0) {
        console.warn('⚠ No platforms fetched');
        return;
      }
      const datasets = platformList.map((platform) => {
        const values = res.map((item) => {
          const key = Object.keys(item)[0];
          const dayData = item[key] as Record<string, any>;
          return dayData?.[platform?.name]?.amount ?? 0;
        });

        return {
          label: platform.name,
          data: values,
          borderColor: this.getRandomColor(),
          backgroundColor: 'transparent',
          tension: 0.4,
          pointRadius: 3,
        };
      });
      const finalGraphData = { labels, datasets };
      this.chartData.set(finalGraphData);

      console.log('📊 SALES GRAPH UPDATED =>', finalGraphData);
    } catch (err) {
      console.error('❌ fetchAndUpdateStates failed', err);
    }
  }

  async ngOnInit() {
    const fetchedPlatforms = await this.platformService.fetchPlatforms();
    this.platforms.set(fetchedPlatforms);
    this.salesDuration.subscribe((duration) => {
      this.fetchAndUpdateStates(duration);
    });
  }

  private getRandomColor(): string {
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgb(${r},${g},${b})`;
  }
}
