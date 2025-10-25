import { Component, OnInit, signal } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { DashboardService } from '../../services/dashboard-service';
import { StaticValuesService } from '../../services/static-values';
import { DashbordStateType, PlatForm } from '../../interfaces';
import { TranslateService } from '@ngx-translate/core';
import { MatRadioModule } from '@angular/material/radio';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-sales-analytics-component',
  templateUrl: './sales-analytics-component.html',
  styleUrls: ['./sales-analytics-component.css'],
  imports: [NgChartsModule, MatRadioModule],
})
export class SalesAnalyticsComponent implements OnInit {
  constructor(
    private staticValService: StaticValuesService,
    private svc: DashboardService,
    private translateService: TranslateService
  ) {}

  salesDuration = new BehaviorSubject<DashbordStateType>('WEEKLY');
  labels = signal<string[]>([]);
  chartData = signal<ChartConfiguration<'line'>['data']>({
    datasets: [],
    labels: [],
  });
  private salesCache: Record<
    DashbordStateType,
    ChartConfiguration<'line'>['data']
  > = {} as any;

  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { point: { radius: 3 } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f3f4f6' } },
    },
    plugins: {
      legend: { position: 'top' },
    },
  };
  lineType: any = 'line';

  async fetchAndUpdateStates(type: DashbordStateType = 'MONTHLY') {
    if (this.salesCache[type]) {
      this.chartData.set(this.salesCache[type]);
      this.labels.set(this.salesCache[type].labels || ([] as any));
      return;
    }

    try {
      const res = await this.svc.getStatsTemp(type);
      const newLabels = res.map((item) => Object.keys(item)[0]);
      this.labels.set(newLabels);
      const platforms = Object.keys(
        this.staticValService.staticValues()?.PlatForm || {}
      ) as PlatForm[];
      const datasets = platforms.map((platform) => {
        const data = res.map((item) => {
          const unitData = Object.values(item)[0];
          return unitData[platform]?.amount || 0;
        });
        const color = this.getRandomColor();
        return {
          label: this.translateService.instant(platform),
          data,
          tension: 0.4,
          fill: false,
          borderColor: color,
          backgroundColor: color,
        };
      });

      const chartData = { labels: newLabels, datasets };
      this.salesCache[type] = chartData;
      this.chartData.set(chartData);
    } catch (error) {
      console.error(error);
    }
  }

  ngOnInit(): void {
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
