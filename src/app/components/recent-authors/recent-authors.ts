import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-recent-authors',
  imports: [DecimalPipe],
  templateUrl: './recent-authors.html',
  styleUrl: './recent-authors.css',
})
export class RecentAuthors {
  list: any[] = [];
  constructor(private svc: DashboardService) {}
  ngOnInit() {
    this.svc.getBestSelling().subscribe((l) => (this.list = l));
  }
}
