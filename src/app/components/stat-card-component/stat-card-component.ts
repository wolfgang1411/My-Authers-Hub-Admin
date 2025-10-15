import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card-component',
  imports: [],
  templateUrl: './stat-card-component.html',
  styleUrl: './stat-card-component.css',
})
export class StatCardComponent {
  @Input() stat!: any;
}
