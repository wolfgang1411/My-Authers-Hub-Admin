import { Component } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { Location } from '@angular/common';

@Component({
  selector: 'app-back',
  imports: [SharedModule],
  templateUrl: './back.html',
  styleUrl: './back.css'
})
export class Back {
  constructor(private location : Location) {}

  /**
   * Navigates back to the previous page.
   */ 
  back() {
  this.location.back();
  }

}
