import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { CommonModule, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-recent-orders-component',
  imports: [CurrencyPipe, CommonModule],
  templateUrl: './recent-orders-component.html',
  styleUrl: './recent-orders-component.css',
})
export class RecentOrdersComponent {
  orders: any[] = [];
  constructor(private svc: DashboardService) {}
  ngOnInit() {
    this.svc.getRecentOrders().subscribe((o) => (this.orders = o));
  }
}
