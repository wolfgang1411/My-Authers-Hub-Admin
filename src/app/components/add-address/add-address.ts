import { Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import {Country} from "country-state-city"
import { Address } from 'src/app/interfaces';
import { AddressService } from 'src/app/services/address-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-add-address',
  imports: [SharedModule,ReactiveFormsModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressSpinnerModule],
  templateUrl: './add-address.html',
  styleUrl: './add-address.css',
})
export class AddAddress implements OnInit, OnDestroy{

  addressService = inject(AddressService)

  addressForm = input.required<FormGroup<AddressDetailsForm>>()
  existingAddress = input<Address | undefined>()

  isPincodeLoading = signal(false)
  countries = signal(Country.getAllCountries());
  defaultCountry = signal<string | null>(Country.getCountryByCode("IN")?.name || null);

  destroy$ = new Subject<void>()


  ngOnInit(): void {
    this.addressForm().controls.pincode.addValidators([this.validatePincode(), Validators.required])
    this.addCountryListner()
    this.addPincodeListner()
    this.prefillAddressDetails()
   
  }

  validatePincode() {
    return (form: AbstractControl): ValidationErrors | null => {
      const pincode = form.value
      const country = this.addressForm().controls.country.value
      const isIndia = country === this.defaultCountry();
      if (isIndia && pincode?.length !== 6) return { invalidPincode: true }
      return null
    }
  }

  addCountryListner() {
    this.addressForm().controls.country.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((country) => {
      this.addressForm().controls.pincode.updateValueAndValidity()
      const isIndia = country === this.defaultCountry();
      this.addressForm().controls.pincode.setValue(null)
      this.addressForm().controls.city.setValue(null)
      this.addressForm().controls.state.setValue(null)
      this.addressForm().controls.city[isIndia ? 'disable' : 'enable']();
      this.addressForm().controls.state[isIndia ? 'disable' : 'enable']();
      this.addressForm().controls.city.updateValueAndValidity();
      this.addressForm().controls.state.updateValueAndValidity();
    })
  }

  addPincodeListner() {
    this.addressForm().controls.pincode.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((pincode) => {
      if(pincode?.length === 6 && this.addressForm().controls.country.value === this.defaultCountry()) {
        this.fetchAndUpdatePincodeDetails(pincode)
      }
    })
  }


  async fetchAndUpdatePincodeDetails(pincode:string) {
    try {
      if(pincode.length !== 6) return;
      this.isPincodeLoading.set(true)
      const postalCode = await this.addressService.fetchPincodeDetails(pincode, false)
      this.addressForm().patchValue({
        city: postalCode.city,
        state: postalCode.state,
      })
    } catch (error) {
      this.addressForm().controls.pincode.setErrors({ pincodeNotFound: true })
      console.log(error);
    } finally {
      this.isPincodeLoading.set(false)
    }
  }
  

  prefillAddressDetails() {
    if(this.existingAddress() ) {
      this.addressForm().patchValue({
        id: this.existingAddress()?.id,
        address: this.existingAddress()?.address,
        city: this.existingAddress()?.city,
        state: this.existingAddress()?.state,
        country: this.existingAddress()?.country,
        pincode: this.existingAddress()?.pincode,
        signupCode: this.existingAddress()?.signupCode,
      })
    } else {
      this.addressForm().patchValue({
        country: this.defaultCountry(),
      })
    }
  }




  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}


export type AddressDetailsForm = {
  id: FormControl<number | null>;
  address: FormControl<string | null>;
  city: FormControl<string | null>;
  state: FormControl<string | null>;
  country: FormControl<string | null>;
  pincode: FormControl<string | null>;
  signupCode: FormControl<string | null>;
}