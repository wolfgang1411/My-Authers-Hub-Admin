import { Component } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile-card-component',
  imports: [SharedModule, RouterLink],
  templateUrl: './profile-card-component.html',
  styleUrl: './profile-card-component.css',
})
export class ProfileCardComponent {
  onClickUpdateImage() {
    alert('Implement image update logic (open file dialog / upload).');
  }
}
