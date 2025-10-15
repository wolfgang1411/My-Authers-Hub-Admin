import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-recent-titles',
  imports: [DecimalPipe, SharedModule],
  templateUrl: './recent-titles.html',
  styleUrl: './recent-titles.css',
})
export class RecentTitles {
  list: any[] = [];
  constructor(private svc: DashboardService) {}
  ngOnInit() {
    this.svc.getBestSelling().subscribe((l) => (this.list = l));
  }
}
