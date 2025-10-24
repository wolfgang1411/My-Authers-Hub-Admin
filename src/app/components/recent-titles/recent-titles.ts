import { Component, Input } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { Title } from '../../interfaces';

@Component({
  selector: 'app-recent-titles',
  imports: [SharedModule],
  templateUrl: './recent-titles.html',
  styleUrl: './recent-titles.css',
})
export class RecentTitles {
  @Input() list!: Title[];
  constructor(private svc: DashboardService) {}
  ngOnInit() {}
}
