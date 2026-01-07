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
} from '@angular/material/dialog';
import { AddressService } from '../../services/address-service';
import { Address, Countries, States, Cities } from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Country, State, City } from 'country-state-city';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from '../../services/logger';

@Component({
  selector: 'app-add-address-dialog',
  standalone: true,
  imports: [
    SharedModule,
    MatDialogContent,
    MatDialogTitle,
    MatDialogActions,
    MatButton,
    MatIcon,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './add-address-dialog.html',
  styleUrl: './add-address-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddAddressDialog implements OnInit {
  dialogRef = inject(MatDialogRef<AddAddressDialog>);
  addressService = inject(AddressService);
  userService = inject(UserService);
  translateService = inject(TranslateService);
  logger = inject(Logger);
  fb = inject(FormBuilder);

  addressForm: FormGroup;
  countries: Countries[] = [];
  states: States[] = [];
  cities: Cities[] = [];
  isLoading = signal(false);

  constructor() {
    this.addressForm = this.fb.group({
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      country: ['', Validators.required],
      pincode: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadCountries();
    this.addressForm.get('country')?.valueChanges.subscribe((countryCode) => {
      if (countryCode) {
        this.loadStates(countryCode);
      }
    });
    this.addressForm.get('state')?.valueChanges.subscribe((stateCode) => {
      if (stateCode) {
        const countryCode = this.addressForm.get('country')?.value;
        if (countryCode) {
          this.loadCities(countryCode, stateCode);
        }
      }
    });
  }

  loadCountries() {
    const countries = Country.getAllCountries();
    this.countries = countries.map((c) => ({
      name: c.name,
      isoCode: c.isoCode,
    }));
  }

  loadStates(countryCode: string) {
    const states = State.getStatesOfCountry(countryCode);
    this.states = states.map((s) => ({
      name: s.name,
      isoCode: s.isoCode,
    }));
    this.cities = [];
    this.addressForm.patchValue({ state: '', city: '' });
  }

  loadCities(countryCode: string, stateCode: string) {
    const cities = City.getCitiesOfState(countryCode, stateCode);
    this.cities = cities.map((c) => ({ name: c.name }));
    this.addressForm.patchValue({ city: '' });
  }

  async validatePincode() {
    const pincode = this.addressForm.get('pincode')?.value;
    const stateCode = this.addressForm.get('state')?.value;
    if (pincode && stateCode) {
      try {
        const result = await this.addressService.validatePincode(
          pincode,
          stateCode
        );
        if (!result.valid) {
          this.addressForm.get('pincode')?.setErrors({ invalidPincode: true });
        }
      } catch (error) {
        this.logger.logError(error);
      }
    }
  }

  async saveAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    try {
      this.isLoading.set(true);
      const user = this.userService.loggedInUser$();
      const formValue = this.addressForm.value;

      // Link address to user instead of author/publisher to allow multiple addresses
      const addressData: Address = {
        id: 0,
        address: formValue.address,
        city: formValue.city,
        state: formValue.state,
        country: formValue.country,
        pincode: formValue.pincode,
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

