import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-browser-usage-component',
  imports: [DecimalPipe],
  templateUrl: './browser-usage-component.html',
  styleUrl: './browser-usage-component.css',
})
export class BrowserUsageComponent {
  browsers: any[] = [];
  total = 1;
  constructor(private svc: DashboardService) {}
  ngOnInit() {
    this.svc.getBrowserUsage().subscribe((b) => {
      this.browsers = b;
      this.total = b.reduce((s: any, x: any) => s + x.value, 0);
    });
  }
  getPct(v: number) {
    return Math.round((v / this.total) * 100);
  }
}
