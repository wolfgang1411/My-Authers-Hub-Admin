import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { DecimalPipe } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
@Component({
  selector: 'app-browser-usage-component',
  imports: [DecimalPipe, MatProgressBarModule],
  templateUrl: './browser-usage-component.html',
  styleUrl: './browser-usage-component.css',
})
export class BrowserUsageComponent {
  browsers: any[] = [];
  total = 1;
  constructor(private svc: DashboardService) {}
  ngOnInit() {
    // this.svc.getBrowserUsage().subscribe((b) => {
    //   this.browsers = b;
    //   this.total = b.reduce((s: any, x: any) => s + x.value, 0);
    // });
  }
  getPct(v: number) {
    return Math.round((v / this.total) * 100);
  }
  colors = ['#ce0000', '#3f32b1', '#00af57', '#fca200'];

  getColor(i: number) {
    return this.colors[i % this.colors.length];
  }
}
