import { Component } from '@angular/core';
import { ChartOptions } from 'chart.js';
import { ChartConfiguration } from 'chart.js';
import { DashboardService } from '../../services/dashboard-service';
import { NgChartsModule } from 'ng2-charts';
import { StaticValuesService } from '../../services/static-values';
import { SalesService } from '../../services/sales';
@Component({
  selector: 'app-sales-analytics-component',
  imports: [NgChartsModule],
  templateUrl: './sales-analytics-component.html',
  styleUrl: './sales-analytics-component.css',
})
export class SalesAnalyticsComponent {
  constructor(
    private staticValService: StaticValuesService,
    private svc: DashboardService,
    private salesService: SalesService
  ) {}

  labels: string[] = [];
  chartData: ChartConfiguration<'line'>['data'] = { datasets: [], labels: [] };
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

  ngOnInit(): void {
    this.svc.getSalesSeries().subscribe((d) => {
      this.labels = d.labels;
      this.chartData = {
        labels: d.labels,
        datasets: [
          {
            label: 'Total Sales',
            data: d.sales,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(99,102,241,0.12)',
            borderColor: 'rgba(99,102,241,0.9)',
          },
          {
            label: 'Total Orders',
            data: d.orders,
            tension: 0.4,
            fill: false,
            borderColor: 'rgba(6,182,212,0.9)',
          },
        ],
      };
    });
  }
}
