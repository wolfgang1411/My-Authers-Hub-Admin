import { Component, OnInit, signal, ViewChild } from '@angular/core';
import {
  ChartConfiguration,
  ChartData,
  ChartDataset,
  ChartOptions,
} from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { DashboardService } from '../../services/dashboard-service';
import { DashbordStateType, Platform } from '../../interfaces';
import { MatRadioModule } from '@angular/material/radio';
import { BehaviorSubject } from 'rxjs';
import { PlatformService } from 'src/app/services/platform';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sales-analytics-component',
  templateUrl: './sales-analytics-component.html',
  styleUrls: ['./sales-analytics-component.css'],
  imports: [NgChartsModule, MatRadioModule],
})
export class SalesAnalyticsComponent implements OnInit {
  constructor(
    private svc: DashboardService,
    private platformService: PlatformService,
    private translate: TranslateService
  ) {}

  salesDuration = new BehaviorSubject<DashbordStateType>('WEEKLY');
  labels = signal<string[]>([]);
  chartData = signal<ChartConfiguration<'line'>['data']>({
    datasets: [],
    labels: [],
  });

  lineType: any = 'line';
  platforms = signal<Platform[]>([]);
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        borderWidth: 3,
      },
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#6B7280', // gray-500
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      y: {
        grid: {
          color: '#E5E7EB', // gray-200
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true, // 🔥 modern dot legend
          pointStyle: 'circle',
          padding: 20,
          color: '#374151', // gray-700
          font: {
            size: 13,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: '#111827',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
      },
    },
  };

  async fetchAndUpdateStates(type: DashbordStateType) {
    const res = (await this.svc.getStatsTemp(type)) as Record<string, any>[];
    if (!res?.length) return;

    // 🔹 TRANSLATED DAY LABELS (Sunday → localized)
    const labels = res.map((item) => {
      const day = Object.keys(item)[0];
      return this.translate.instant(day);
    });

    this.labels.set(labels);

    // 🔹 FILTER PLATFORMS WITH SALES
    const platformsWithSales = this.platforms().filter((platform) =>
      res.some((item) => {
        const day = Object.keys(item)[0];
        return (item[day]?.[platform.name]?.count ?? 0) > 0;
      })
    );

    // 🔹 BUILD DATASETS WITH TRANSLATED LABELS
    const datasets: ChartDataset<'line', number[]>[] = platformsWithSales.map(
      (platform) => {
        const values = res.map((item) => {
          const day = Object.keys(item)[0];
          return item[day]?.[platform.name]?.count ?? 0;
        });

        return {
          label: this.translate.instant(platform.name), // 🔥 translated legend
          data: values,
          borderColor: this.getColorForPlatform(platform.name),
          backgroundColor: 'transparent',
          tension: 0.4,
          pointRadius: 4,
        };
      }
    );

    this.chartData.set({
      labels,
      datasets,
    });
  }
  private getColorForPlatform(platform: string): string {
    const colorMap: Record<string, string> = {
      KINDLE: '#2563EB', // blue-600
      AMAZON: '#F59E0B', // amber-500
      MAH_EBOOK: '#10B981', // emerald-500
      OTHER_EBOOK_STORES: '#475569', // ✅ slate-600 (FIXED)
    };

    return colorMap[platform] || '#6B7280';
  }

  async ngOnInit() {
    const fetchedPlatforms = await this.platformService.fetchPlatforms();
    this.platforms.set(fetchedPlatforms);
    this.salesDuration.subscribe((duration) => {
      this.fetchAndUpdateStates(duration);
    });
  }
}
