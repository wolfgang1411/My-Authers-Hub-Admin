import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Back } from '../../components/back/back';

@Component({
  selector: 'app-title-details',
  imports: [MatProgressBarModule, MatIconModule, Back],
  templateUrl: './title-details.html',
  styleUrl: './title-details.css',
})
export class TitleDetails {}
