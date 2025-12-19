import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-terms',
  imports: [RouterModule, DatePipe],
  templateUrl: './terms.html',
  styleUrl: './terms.css',
})
export class Terms {
  currentDate = new Date();
}

