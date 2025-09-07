import { Component, inject, model, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  StepperOrientation,
  MatStepperModule,
} from '@angular/material/stepper';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { UploadFile } from '../../components/upload-file/upload-file';
import { PublisherService } from '../publisher/publisher-service';
import { Address, createBankDetails, Publishers } from '../../interfaces';
import { AddressService } from '../../services/address-service';
import { BankDetailService } from '../../services/bank-detail-service';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-add-publisher',
  imports: [
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncPipe,
    SharedModule,
    MatSelectModule,
    MatCardModule,
    UploadFile,
  ],
  templateUrl: './add-publisher.html',
  styleUrl: './add-publisher.css',
})
export class AddPublisher {
  constructor(
    private publisherService: PublisherService,
    private addressService: AddressService,
    private bankDetailService: BankDetailService,
    private route: ActivatedRoute
  ) {
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
    this.route.params.subscribe(({ id, signupCode }) => {
      this.publisherId = id;
      this.signupCode = signupCode;
    });
  }

  signupCode?: string;
  publisherId!: number;
  publisherDetails?: Publishers;
  async ngOnInit() {
    this.publisherFormGroup.valueChanges.subscribe((v) => {
      console.log({ v });
    });
    if (this.publisherId) {
      const response = await this.publisherService.getPublisherById(
        this.publisherId
      );
      this.publisherDetails = response;
      this.prefillForm(response);
      this.publisherFormGroup.controls.signupCode.patchValue(this.signupCode || null);
      this.publisherAddressDetails.controls.signupCode.patchValue(this.signupCode || null)
      this.publisherBankDetails.controls.signupCode.patchValue(this.signupCode || null)

    } 
  }
  private _formBuilder = inject(FormBuilder);
  stepperOrientation: Observable<StepperOrientation>;

  publisherFormGroup = this._formBuilder.group({
    id: <number | null>null,
    pocName: ['', Validators.required],
    pocEmail: ['', [Validators.required, Validators.email]],
    pocPhoneNumber: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    designation: ['', Validators.required],
    logo: [''],
    signupCode: <string | null>null,
  });

  publisherBankDetails = this._formBuilder.group({
    id: <number | null>null,
    name: ['', Validators.required],
    accountNo: ['', Validators.required],
    ifsc: ['', Validators.required],
    panCardNo: ['', Validators.required],
    accountType: ['', Validators.required],
    signupCode: <string | null>null,
  });

  publisherAddressDetails = this._formBuilder.group({
    id: <number | null>null,
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    country: ['', Validators.required],
    pincode: ['', Validators.required],
    signupCode: <string | null>null,
  });

  prefillForm(publisherDetails: Publishers) {
    this.publisherFormGroup.patchValue({
      id: publisherDetails.id,
      pocName:
        publisherDetails.user.firstName + ' ' + publisherDetails.user.lastName,
      pocEmail: publisherDetails.user.email,
      pocPhoneNumber: publisherDetails.user.phoneNumber,
      email: publisherDetails.email,
      name: publisherDetails.name,
      designation: publisherDetails.designation,
      
    });
    this.publisherAddressDetails.patchValue({
      id: publisherDetails.address[0]?.id,
      address: publisherDetails.address[0]?.address,
      city: publisherDetails.address[0]?.city,
      state: publisherDetails.address[0]?.state,
      country: publisherDetails.address[0]?.country,
      pincode: publisherDetails.address[0]?.pincode,
    });
    this.publisherBankDetails.patchValue({
      id: publisherDetails.bankDetails?.[0]?.id,
      name: publisherDetails.bankDetails?.[0]?.name,
      accountNo: publisherDetails.bankDetails?.[0]?.accountNo,
      ifsc: publisherDetails.bankDetails?.[0]?.ifsc,
      panCardNo: publisherDetails.bankDetails?.[0]?.panCardNo,
      accountType: publisherDetails.bankDetails?.[0]?.accountType,
    });
  }

  async onSubmit() {
    const publisherData = this.publisherFormGroup.value;
    try {
      const response = (await this.publisherService.createPublisher(
        publisherData as Publishers
      )) as Publishers;
      if (response && response.id) {
        const publisherAddressData = {
          ...this.publisherAddressDetails.value,
          publisherId: response.id,
        };
        await this.addressService.createOrUpdateAddress({
          ...publisherAddressData,
          publisherId: response.id,
        } as Address);

        const publisherBankData = {
          ...this.publisherBankDetails.value,
          publisherId: response.id,
        };
        await this.bankDetailService.createOrUpdateBankDetail(
          publisherBankData as createBankDetails
        );
      }
      Swal.fire({
        title: 'success',
        icon: 'success',
        text: response.id
          ? 'You have successfully updated the publisher.'
          : 'You have successfully created the publisher.',
        heightAuto: false,
      });
    } catch (error: any) {
      Swal.fire({
        title: 'error',
        text: error.message,
        icon: 'error',
        heightAuto: false,
      });
    }
  }
}
