import { Component, Renderer2 } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { RouterLink } from '@angular/router';
import { UserService } from 'src/app/services/user';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile-card-component',
  imports: [SharedModule, RouterLink, MatIconModule],
  templateUrl: './profile-card-component.html',
  styleUrl: './profile-card-component.css',
})
export class ProfileCardComponent {
  constructor(public userService: UserService, private renderrer: Renderer2) {}
  onClickUpdateImage() {
    const inputElem: HTMLInputElement = this.renderrer.createElement('input');
    this.renderrer.setAttribute(inputElem, 'type', 'file');
    this.renderrer.setAttribute(
      inputElem,
      'accept',
      'image/png, image/gif, image/jpeg'
    );
    inputElem.click();
    inputElem.onchange = (event) => {
      const elem = event.target as HTMLInputElement;
      if (elem.files?.length) {
        this.userService
          .updateMyImage(elem.files.item(0) as File)
          .then(() => {
            Swal.fire({
              icon: 'success',
              title: 'success',
              text: 'Your image has been updated successfully !',
              heightAuto: false,
            });
          })
          .catch((error) => {
            console.log(error);
          });
      }
    };
  }
}
