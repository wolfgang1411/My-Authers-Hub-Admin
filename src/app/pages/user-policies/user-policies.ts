import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-user-policies',
  imports: [RouterModule, DatePipe],
  templateUrl: './user-policies.html',
  styleUrl: './user-policies.css',
})
export class UserPolicies {
  currentDate = new Date();
}

