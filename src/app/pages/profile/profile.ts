import { Component, Signal, signal, effect } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { UserService } from '../../services/user';
import { User, UpdateUser } from '../../interfaces';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  loggedInUser: Signal<User | null>;
  loading = signal(false);
  notificationForm: FormGroup;

  constructor(private userService: UserService) {
    this.loggedInUser = this.userService.loggedInUser$;
    
    // Initialize form with default values
    this.notificationForm = new FormGroup({
      isSendEmailNotifications: new FormControl(true, [Validators.required]),
      isSendNotifications: new FormControl(true, [Validators.required]),
    });

    // Update form when user data changes
    effect(() => {
      const user = this.loggedInUser();
      if (user) {
        this.notificationForm.patchValue({
          isSendEmailNotifications: user.isSendEmailNotifications ?? true,
          isSendNotifications: user.isSendNotifications ?? true,
        }, { emitEvent: false });
      }
    });
  }

  async onToggleChange() {
    if (!this.loggedInUser()?.id) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'User information not available',
      });
      return;
    }

    if (this.notificationForm.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      const updateData: UpdateUser = {
        id: this.loggedInUser()!.id,
        isSendEmailNotifications: this.notificationForm.value.isSendEmailNotifications,
        isSendNotifications: this.notificationForm.value.isSendNotifications,
      };

      const updatedUser = await this.userService.createOrUpdateUser(updateData);
      
      // Update the logged-in user in the service
      this.userService.setLoggedInUser(updatedUser);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Notification preferences updated successfully!',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update notification preferences. Please try again.',
      });
      
      // Revert form to original values
      const user = this.loggedInUser();
      if (user) {
        this.notificationForm.patchValue({
          isSendEmailNotifications: user.isSendEmailNotifications ?? true,
          isSendNotifications: user.isSendNotifications ?? true,
        }, { emitEvent: false });
      }
    } finally {
      this.loading.set(false);
    }
  }
}
