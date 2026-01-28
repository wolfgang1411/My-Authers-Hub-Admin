import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogTitle,
  MatDialogActions,
  MatDialogModule,
} from '@angular/material/dialog';
import { AddressService } from '../../services/address-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserService } from '../../services/user';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from '../../services/logger';
import { AddAddress, AddressDetailsForm } from '../add-address/add-address';
import { Address } from 'cluster';
import { AddressLinkType } from 'src/app/interfaces';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-address-dialog',
  standalone: true,
  imports: [
    SharedModule,
    MatButton,
    MatIcon,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AddAddress,
    MatDialogModule
  ],
  templateUrl: './add-address-dialog.html',
  styleUrl: './add-address-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddAddressDialog {
  dialogRef = inject(MatDialogRef<AddAddressDialog>);
  addressService = inject(AddressService);
  userService = inject(UserService);
  translateService = inject(TranslateService);
  logger = inject(Logger);


  isLoading = signal(false)


  addressForm = new FormGroup<AddressDetailsForm>({
    id: new FormControl<number | null>(null),
    address: new FormControl<string | null>(null, Validators.required),
    city: new FormControl<string | null>({
      value: null,
      disabled: true
    }, Validators.required),
    state: new FormControl<string | null>({
      value: null,
      disabled: true
    }, Validators.required),
    country: new FormControl<string | null>(null, Validators.required),
    pincode: new FormControl<string | null>(null, [Validators.required]),
    signupCode: new FormControl<string | null>(null),
  });;



  async saveAddress() {

    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    try {
      this.isLoading.set(true);
      const user = this.userService.loggedInUser$();
      // const formValue = this.addressForm.value;

      const { address: addressControl, city: cityControl, state: stateControl, country: countryControl, pincode: pincodeControl, signupCode: signupCodeControl } = this.addressForm.controls;


      // Link address to user instead of author/publisher to allow multiple addresses
      const addressData: any = {
        address: addressControl.value || '',
        city: cityControl.value || '',
        state: stateControl.value,
        country: countryControl.value,
        pincode: pincodeControl.value,
        type: AddressLinkType.USER, // General address dialog links to user
        // Don't send autherId or publisherId - link to user instead
      };

      const savedAddress = await this.addressService.createOrUpdateAddress(
        addressData
      );

      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success') || 'Success',
        text:
          this.translateService.instant('addressaddedsuccessfully') ||
          'Address added successfully',
        timer: 2000,
        showConfirmButton: false,
      });

      this.dialogRef.close(savedAddress);
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translateService.instant('failedtoaddaddress') ||
          'Failed to add address',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  close() {
    this.dialogRef.close();
  }
}

