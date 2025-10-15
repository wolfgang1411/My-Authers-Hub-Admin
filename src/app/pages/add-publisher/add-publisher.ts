import { Component, inject, model, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormArray,
  FormGroup,
  FormControl,
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
import { ActivatedRoute, Router } from '@angular/router';
import { InviteService } from '../../services/invite';
import {
  socialMediaGroup,
  SocialMediaType,
} from '../../interfaces/SocialMedia';
import { SocialMedia } from '../social-media/social-media';
import { SocialMediaService } from '../../services/social-media-service';
import { NGXIntlTel } from '../../interfaces/Intl';
import {
  CountryISO,
  NgxIntlTelInputModule,
  PhoneNumberFormat,
  SearchCountryField,
} from 'ngx-intl-tel-input';
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
    SocialMedia,
    NgxIntlTelInputModule,
  ],
  templateUrl: './add-publisher.html',
  styleUrl: './add-publisher.css',
})
export class AddPublisher {
  constructor(
    private publisherService: PublisherService,
    private addressService: AddressService,
    private bankDetailService: BankDetailService,
    private route: ActivatedRoute,
    private router: Router,
    private inviteService: InviteService,
    private socialService: SocialMediaService
  ) {
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
    this.route.params.subscribe(({ id, signupCode }) => {
      this.publisherId = Number(id) || undefined;
      this.signupCode = signupCode;
    });
  }

  signupCode?: string;
  publisherId?: number;
  publisherDetails?: Publishers;
  inputData = {
    separateDialCode: true,
    SearchCountryField: SearchCountryField,
    CountryISO: CountryISO,
    PhoneNumberFormat: PhoneNumberFormat,
    preferredCountries: [
      CountryISO.India,
      CountryISO.Denmark,
      CountryISO.Sweden,
      CountryISO.Norway,
      CountryISO.Finland,
      CountryISO.Germany,
    ],
  };

  async ngOnInit() {
    if (this.publisherId) {
      const response = await this.publisherService.getPublisherById(
        this.publisherId
      );
      this.publisherDetails = response;
      this.prefillForm(response);
    }

    this.publisherFormGroup.controls.signupCode.patchValue(
      this.signupCode || null
    );
    this.publisherAddressDetails.controls.signupCode.patchValue(
      this.signupCode || null
    );
    this.publisherBankDetails.controls.signupCode.patchValue(
      this.signupCode || null
    );

    if (this.signupCode) {
      const invite = await this.inviteService.findOne(this.signupCode);
      this.publisherFormGroup.controls.pocEmail.patchValue(invite.email);
      this.publisherFormGroup.controls.pocEmail.disable();
    }
    Object.values(SocialMediaType).forEach((type) => {
      this.socialMediaArray.push(
        new FormGroup({
          type: new FormControl<SocialMediaType | null>(type),
          url: new FormControl<string | null>(
            '',
            Validators.pattern(/^https?:\/\/.+/)
          ),
          name: new FormControl<string | null>(''),
          autherId: new FormControl<number | null>(null),
          publisherId: new FormControl<number | null>(null),
          id: new FormControl<number | null>(null),
        })
      );
    });
  }
  private _formBuilder = inject(FormBuilder);
  stepperOrientation: Observable<StepperOrientation>;

  publisherFormGroup = this._formBuilder.group({
    id: <number | null>null,
    pocName: ['', Validators.required],
    pocEmail: ['', [Validators.required, Validators.email]],
    pocPhoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    designation: ['', Validators.required],
    logo: [''],
    userPassword: [
      '',
      this.signupCode ? [] : [Validators.required, Validators.minLength(8)],
    ],
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
  publisherSocialMediaGroup = new FormGroup({
    socialMedia: new FormArray<
      FormGroup<{
        type: FormControl<SocialMediaType | null>;
        url: FormControl<string | null>;
        publisherId: FormControl<number | null>;
        name: FormControl<string | null>;
        autherId: FormControl<number | null>;
        id: FormControl<number | null>;
      }>
    >([]),
  });

  get socialMediaArray(): FormArray<socialMediaGroupType> {
    return this.publisherSocialMediaGroup.get(
      'socialMedia'
    ) as FormArray<socialMediaGroupType>;
  }

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
    const socialMediaArray = this.publisherSocialMediaGroup.get(
      'socialMedia'
    ) as FormArray<socialMediaGroupType>;
    socialMediaArray.clear();
    publisherDetails.socialMedias?.forEach((media) => {
      socialMediaArray.push(
        new FormGroup({
          type: new FormControl<SocialMediaType | null>(media.type),
          url: new FormControl<string | null>(media.url),
          publisherId: new FormControl<number | null>(media.publisherId),
          name: new FormControl<string | null>(media.name),
          autherId: new FormControl<number | null>(media.autherId),
          id: new FormControl<number | null>(media.id),
        })
      );
    });
  }

  async onSubmit() {
    const publisherData = {
      ...this.publisherFormGroup.value,
      pocEmail: this.publisherFormGroup.controls.pocEmail.value,
    } as any;

    try {
      const response = (await this.publisherService.createPublisher(
        publisherData
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
        const socialMediaData = this.socialMediaArray.controls
          .map((group) => ({
            ...group.value,
            publisherId: response.id,
          }))
          .filter((item) => item.url?.trim());
        if (socialMediaData.length > 0) {
          await this.socialService.createOrUpdateSocialMediaLinks(
            socialMediaData as socialMediaGroup[]
          );
          console.log(socialMediaData, 'social media');
        }
      }
      let html = 'You have successfully created the publisher.';
      if (response.id) {
        html = 'You have successfully updated the publisher.';
      }

      if (this.signupCode) {
        html = `You have successfully registerd as publisher please login to continue`;
      }

      await Swal.fire({
        title: 'success',
        icon: 'success',
        html,
        heightAuto: false,
      });
      if (this.signupCode) {
        this.router.navigate(['/login']);
      }
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
type socialMediaGroupType = FormGroup<{
  type: FormControl<SocialMediaType | null>;
  url: FormControl<string | null>;
  publisherId: FormControl<number | null>;
  name: FormControl<string | null>;
  autherId: FormControl<number | null>;
  id: FormControl<number | null>;
}>;
