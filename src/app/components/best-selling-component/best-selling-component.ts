import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-best-selling-component',
  imports: [DecimalPipe],
  templateUrl: './best-selling-component.html',
  styleUrl: './best-selling-component.css',
})
export class BestSellingComponent {
  list: any[] = [];
  constructor(private svc: DashboardService) {}
  ngOnInit() {
    this.svc.getBestSelling().subscribe((l) => (this.list = l));
  }
}
