import { Component, Input } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-stat-card-component',
  imports: [SharedModule],
  templateUrl: './stat-card-component.html',
  styleUrl: './stat-card-component.css',
})
export class StatCardComponent {
  @Input() stat!: any;
}
