import {
  Component,
  computed,
  effect,
  inject,
  model,
  Signal,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormArray,
  FormGroup,
  FormControl,
  ValidatorFn,
  ValidationErrors,
  AbstractControl,
  AsyncValidatorFn,
} from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  StepperOrientation,
  MatStepperModule,
} from '@angular/material/stepper';
import { Observable } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { UploadFile } from '../../components/upload-file/upload-file';
import { PublisherService } from '../publisher/publisher-service';
import {
  Address,
  BankOption,
  Cities,
  Countries,
  createBankDetails,
  Media,
  Publishers,
  SocialMediaType,
  States,
  UpdateTicketType,
  User,
} from '../../interfaces';
import { AddressService } from '../../services/address-service';
import { BankDetailService } from '../../services/bank-detail-service';
import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { InviteService } from '../../services/invite';
import {
  socialMediaGroup,
  SocialMediaGroupType,
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
import { UserService } from '../../services/user';
import { MatIcon } from '@angular/material/icon';
import { TranslateService } from '@ngx-translate/core';
import { Back } from '../../components/back/back';
import { HttpClient } from '@angular/common/http';
import { City, Country, State } from 'country-state-city';
import md5 from 'md5';
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
    MatIcon,
    Back,
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
    private socialService: SocialMediaService,
    private userService: UserService,
    private translateService: TranslateService
  ) {
    effect(() => {
      const selected =
        (this.publisherSocialMediaGroup.get('socialMedia') as FormArray)?.value
          ?.map((s: any) => s?.type)
          ?.filter((t: string) => !!t) ?? [];
      this.selectedTypes.set(selected);
    });

    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
    this.route.params.subscribe(({ id, signupCode }) => {
      this.publisherId = Number(id) || undefined;
      this.signupCode = signupCode;
    });
    this.loggedInUser = this.userService.loggedInUser$;
  }
  private http = inject(HttpClient);

  bankOptions = signal<BankOption[]>([]);
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
  loggedInUser!: Signal<User | null>;
  selectedTypes = signal<string[]>([]);
  countries!: Countries[];
  states!: States[];
  cities!: Cities[];
  isPrefilling: boolean = false;
  mediaToDeleteId: number | null = null;
  isAllSelected = computed(() => {
    return this.selectedTypes().length >= this.socialMediaArray.length;
  });

  async ngOnInit() {
    this.publisherFormGroup.controls.signupCode.patchValue(
      this.signupCode || null
    );
    this.publisherAddressDetails.controls.signupCode.patchValue(
      this.signupCode || null
    );
    this.publisherBankDetails.controls.signupCode.patchValue(
      this.signupCode || null
    );
    this.countries = Country.getAllCountries().map((c) => ({
      name: c.name,
      isoCode: c.isoCode,
    }));
    this.publisherAddressDetails
      .get('country')
      ?.valueChanges.subscribe((countryIso) => {
        this.publisherAddressDetails.controls.pincode.updateValueAndValidity();
        if (countryIso) {
          this.states = State.getStatesOfCountry(countryIso).map((s) => ({
            name: s.name,
            isoCode: s.isoCode,
          }));
          this.publisherAddressDetails.patchValue({ state: '', city: '' });
          this.cities = [];
        }
      });
    this.publisherAddressDetails
      .get('state')
      ?.valueChanges.subscribe((stateIso) => {
        const countryIso = this.publisherAddressDetails.get('country')?.value;
        if (countryIso && stateIso) {
          this.cities = City.getCitiesOfState(countryIso, stateIso).map(
            (c) => ({
              name: c.name,
            })
          );
          this.publisherAddressDetails.patchValue({ city: '' });
        }
      });
    this.publisherAddressDetails
      .get('pincode')
      ?.valueChanges.pipe(debounceTime(400))
      .subscribe((pin) => {
        const countryIso = this.publisherAddressDetails.get('country')?.value;
        if (countryIso === 'IN' && pin?.length === 6) {
          // this.lookupByPincode(pin);
        }
      });
    this.publisherBankDetails.controls.name.valueChanges.subscribe((v) => {
      this.selectedBankPrefix.set(
        this.bankOptions().find(({ name }) => name === v)?.bankCode || null
      );
    });
    this.bankOptions.set(this.bankDetailService.fetchBankOptions());

    if (this.signupCode) {
      const invite = await this.inviteService.findOne(this.signupCode);
      this.publisherFormGroup.controls.pocEmail.patchValue(invite.email);
      this.publisherFormGroup.controls.pocEmail.disable();
    }

    if (this.publisherId) {
      this.publisherFormGroup.controls.userPassword.disable();

      const response = await this.publisherService.getPublisherById(
        this.publisherId
      );
      this.publisherDetails = response;
      this.isPrefilling = true;
      this.prefillForm(response);
      this.isPrefilling = false;
    }
  }
  // lookupByPincode(pin: string) {
  //   if (this.isPrefilling) return;

  //   this.http
  //     .get<any[]>(`https://api.postalpincode.in/pincode/${pin}`)
  //     .subscribe((res) => {
  //       if (res && res[0].Status === 'Success') {
  //         const data = res[0].PostOffice?.[0];
  //         this.publisherAddressDetails.patchValue({
  //           city: data?.District,
  //           state: data?.State,
  //           country: 'India',
  //         });
  //       } else {
  //         Swal.fire({
  //           icon: 'warning',
  //           title: 'Invalid Pincode',
  //           text: 'Please enter a valid 6-digit pincode.',
  //         });
  //         this.publisherAddressDetails.patchValue({
  //           city: '',
  //           state: '',
  //           country: '',
  //         });
  //       }
  //     });
  // }
  private _formBuilder = inject(FormBuilder);
  stepperOrientation: Observable<StepperOrientation>;

  validatePincode(): AsyncValidatorFn {
    return async (control) => {
      const pin = control.value;
      const country = this.publisherAddressDetails.controls.country.value;
      const isIndia = ['IN', 'INDIA', 'india', 'India', 'in'].includes(
        country || ''
      );

      // Skip async validation if field is empty
      if (!pin || !isIndia) {
        return null;
      }

      // Optional: basic length check (India)
      if (pin?.length !== 6) {
        return { invalidPincode: true };
      }

      try {
        const { valid } = await this.addressService.validatePincode(pin);
        // Expecting: { valid: boolean } or similar
        if (valid) {
          return null; // Valid pincode
        }
        return { invalidPincode: true }; // Invalid from API
      } catch (err) {
        return { invalidPincode: true }; // API error = invalid
      }
    };
  }

  panCardValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

      return panRegex.test(control.value.toUpperCase())
        ? null
        : { invalidPan: true };
    };
  }

  ifscCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const prefix = this.bankOptions().find(
        ({ name }) => name === this.publisherBankDetails.controls.name.value
      )?.bankCode;
      if (!prefix) return null;
      const value = control.value?.toUpperCase?.().trim?.() || '';
      if (!value) return null;
      return value.startsWith(prefix.toUpperCase())
        ? null
        : {
            startsWith: this.translateService.instant(
              'invalidifscodestartwitherror',
              {
                prefix,
              }
            ),
          };
    };
  }

  accountMatchValidator(): ValidatorFn {
    return (form: AbstractControl): ValidationErrors | null => {
      const acc = form.get('accountNo');
      const confirm = form.get('confirmAccountNo');

      if (!acc || !confirm) return null;

      const confirmErrors = confirm.errors || {};

      if (!confirm.value) {
        delete confirmErrors['notMatching'];
        confirm.setErrors(
          Object.keys(confirmErrors).length ? confirmErrors : null
        );
        return null;
      }
      if (acc.value !== confirm.value) {
        confirm.setErrors({ ...confirmErrors, notMatching: true });
      } else {
        delete confirmErrors['notMatching'];
        confirm.setErrors(
          Object.keys(confirmErrors).length ? confirmErrors : null
        );
      }

      return null;
    };
  }

  publisherFormGroup = this._formBuilder.group({
    id: <number | null>null,
    pocName: ['', Validators.required],
    pocEmail: ['', [Validators.required, Validators.email]],
    pocPhoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    designation: ['', Validators.required],
    medias: this._formBuilder.array<Media>([]),
    userPassword: ['', [Validators.required, Validators.minLength(8)]],
    signupCode: <string | null>null,
  });

  selectedBankPrefix = signal<string | null>(null);
  publisherBankDetails = this._formBuilder.group(
    {
      id: <number | null>null,
      accountHolderName: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)],
      ],
      name: ['', [Validators.required]],
      accountNo: ['', [Validators.required]],
      confirmAccountNo: ['', [Validators.required]],
      ifsc: ['', [Validators.required, this.ifscCodeValidator()]],
      panCardNo: ['', [Validators.required, this.panCardValidator()]],
      accountType: ['', Validators.required],
      signupCode: <string | null>null,
    },
    {
      validators: [this.accountMatchValidator()],
    }
  );

  publisherAddressDetails = this._formBuilder.group({
    id: <number | null>null,
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    country: ['', Validators.required],
    pincode: ['', [Validators.required], [this.validatePincode()]],
    signupCode: <string | null>null,
  });
  publisherSocialMediaGroup = new FormGroup({
    socialMedia: new FormArray<FormGroup<SocialMediaGroupType>>([
      this.createSocialGroup(),
    ]),
  });
  createSocialGroup(): FormGroup<SocialMediaGroupType> {
    return new FormGroup<SocialMediaGroupType>({
      type: new FormControl<SocialMediaType | null>(null, [
        Validators.required,
      ]),
      url: new FormControl<string | null>(null, [Validators.required]),
      publisherId: new FormControl<number | null>(null),
      name: new FormControl<string | null>(null),
      autherId: new FormControl<number | null>(null),
      id: new FormControl<number | null>(null),
    });
  }
  step1Form = this._formBuilder.group({
    basic: this.publisherFormGroup,
    social: this.publisherSocialMediaGroup,
  });

  get socialMediaArray(): FormArray<FormGroup<SocialMediaGroupType>> {
    return this.publisherSocialMediaGroup.get('socialMedia') as FormArray<
      FormGroup<SocialMediaGroupType>
    >;
  }
  get mediasArray() {
    return this.publisherFormGroup.get('medias') as FormArray;
  }

  onMediaAdded(newMedia: Media) {
    const existing = this.mediasArray.value[0];

    if (existing?.id) {
      this.mediaToDeleteId = existing.id;
    }
    this.mediasArray.setControl(
      0,
      this._formBuilder.control({
        ...newMedia,
        id: 0,
        url: '',
      })
    );

    console.log('🆕 New media selected', this.mediasArray.value[0]);
  }

  addSocialMedia() {
    this.socialMediaArray.push(
      new FormGroup<SocialMediaGroupType>({
        type: new FormControl<SocialMediaType | null>(null, [
          Validators.required,
        ]),
        url: new FormControl<string | null>(null, [Validators.required]),
        publisherId: new FormControl<number | null>(null),
        name: new FormControl<string | null>(null, [Validators.required]),
        autherId: new FormControl<number | null>(null),
        id: new FormControl<number | null>(null),
      })
    );
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
    const addr = publisherDetails.address[0];

    const countryIso =
      this.countries.find(
        (c) =>
          addr.country?.toLowerCase() === c.name.toLowerCase() ||
          addr.country?.toLowerCase() === c.isoCode.toLowerCase()
      )?.isoCode || '';

    this.publisherAddressDetails.patchValue({
      id: addr.id,
      address: addr.address,
      country: countryIso,
    });
    console.log({ addr }, 'addresss');
    this.states = State.getStatesOfCountry(countryIso).map((s) => ({
      name: s.name,
      isoCode: s.isoCode,
    }));
    console.log(this.states, 'states');
    const stateIso =
      this.states.find(
        (s) => s.isoCode.toLowerCase() === addr.state?.toLowerCase()
      )?.isoCode || '';
    console.log({ stateIso }, 'stateIso');
    this.publisherAddressDetails.patchValue({
      state: stateIso,
    });

    this.cities = City.getCitiesOfState(countryIso, stateIso).map((c) => ({
      name: c.name,
    }));

    const cityName =
      this.cities.find((c) => c.name.toLowerCase() === addr.city?.toLowerCase())
        ?.name || '';

    this.publisherAddressDetails.patchValue({
      city: cityName,
      pincode: addr.pincode,
    });

    this.selectedBankPrefix.set(
      this.bankOptions().find(
        ({ name }) => name === publisherDetails.bankDetails?.[0]?.name
      )?.bankCode || null
    );
    this.publisherBankDetails.patchValue({
      id: publisherDetails.bankDetails?.[0]?.id,
      accountHolderName: publisherDetails.bankDetails?.[0]?.accountHolderName,
      name: publisherDetails.bankDetails?.[0]?.name,
      accountNo: publisherDetails.bankDetails?.[0]?.accountNo,
      confirmAccountNo: publisherDetails.bankDetails?.[0]?.accountNo,
      ifsc: publisherDetails.bankDetails?.[0]?.ifsc,
      panCardNo: publisherDetails.bankDetails?.[0]?.panCardNo,
      accountType: publisherDetails.bankDetails?.[0]?.accountType,
    });
    const socialMediaArray = this.publisherSocialMediaGroup.get(
      'socialMedia'
    ) as FormArray<FormGroup<SocialMediaGroupType>>;

    socialMediaArray.clear();
    if (!publisherDetails.socialMedias?.length) {
      socialMediaArray.push(this.createSocialGroup());
    }
    publisherDetails.socialMedias?.forEach((media) => {
      const group = new FormGroup<SocialMediaGroupType>({
        type: new FormControl<SocialMediaType | null>(media.type),
        url: new FormControl<string | null>(media.url),
        publisherId: new FormControl<number | null>(media.publisherId),
        name: new FormControl<string | null>(media.name),
        autherId: new FormControl<number | null>(media.autherId),
        id: new FormControl<number | null>(media.id),
      });
      socialMediaArray.push(group);
    });
    const mediaList = publisherDetails.medias as Media[];
    this.mediasArray.clear();
    if (mediaList?.length > 0) {
      this.mediasArray.push(this._formBuilder.control(mediaList[0]));
    }
    console.log(this.publisherFormGroup.value, 'prefillll');
  }
  get isAllSocialMediaSelected(): boolean {
    const allOptions = this.socialMediaArray ?? [];
    const formValue = this.publisherSocialMediaGroup?.value ?? {};
    const selectedTypes: string[] = (formValue.socialMedia ?? [])
      .map((s: any) => s?.type)
      .filter((t: string) => !!t);

    return selectedTypes.length >= allOptions.length;
  }

  async handleNewOrSuperAdminSubmission(publisherData: Publishers) {
    const response = (await this.publisherService.createPublisher(
      publisherData
    )) as Publishers;
    this.publisherId = response.id;

    if (response && response.id) {
      const publisherAddressData = {
        ...this.publisherAddressDetails.value,
        publisherId: response.id,
      };

      await this.addressService.createOrUpdateAddress(
        publisherAddressData as Address
      );
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
      }
      const media = this.mediasArray.value[0];
      if (this.mediaToDeleteId && media?.file) {
        await this.publisherService.removeImage(this.mediaToDeleteId);
        console.log('🗑 Old image deleted');

        await this.publisherService.updateMyImage(media.file, response.id);
        console.log('⬆ New image uploaded');
      } else if (!this.mediaToDeleteId && media?.file) {
        await this.publisherService.updateMyImage(media.file, response.id);
        console.log('📤 New image uploaded (no old media existed)');
      }
    }

    let html = 'You have successfully created the publisher.';

    if (response?.id) {
      html = 'You have successfully updated the publisher.';
    }

    if (this.signupCode) {
      html = `You have successfully registered as publisher. Please login to continue.`;
    }

    await Swal.fire({
      title: 'Success',
      icon: 'success',
      html,
      heightAuto: false,
    });
  }
  async handlePublisherUpdateFlow(publisherData: Publishers) {
    const sections = [
      {
        type: UpdateTicketType.ADDRESS,
        fields: ['address', 'city', 'state', 'country', 'pincode'],
      },
      {
        type: UpdateTicketType.BANK,
        fields: [
          'bankName',
          'accountNo',
          'ifsc',
          'panCardNo',
          'accountType',
          'gstNumber',
        ],
      },
      {
        type: UpdateTicketType.PUBLISHER,
        fields: ['publisherName', 'publisherEmail'],
      },
    ];

    const rawValue = {
      ...this.publisherAddressDetails.value,
      ...this.publisherBankDetails.value,
      ...publisherData,
      accountHolderName: this.publisherBankDetails.value.accountHolderName,
      bankName: this.publisherBankDetails.value.name,
      publisherName: this.publisherFormGroup.value.name,
      publisherEmail: this.publisherFormGroup.value.email,
      publisherPocName: this.publisherFormGroup.value.pocName,
      publisherPocEmail: this.publisherFormGroup.value.pocEmail,
      publisherPocPhoneNumber: this.publisherFormGroup.value.pocPhoneNumber,
      publisherDesignation: this.publisherFormGroup.value.designation,
    };

    for (const section of sections) {
      const payload: any = { type: section.type };
      let hasValues = false;

      section.fields.forEach((field: string) => {
        const value = rawValue[field as keyof typeof rawValue];
        if (value !== undefined && value !== null && value !== '') {
          payload[field] = value;
          hasValues = true;
        } else {
          payload[field] = null;
        }
      });

      if (hasValues) {
        await this.userService.raisingTicket(payload);
      }

      const socialMediaData = this.socialMediaArray.controls
        .map((group) => ({
          ...group.value,
          publisherId: this.publisherId,
        }))
        .filter((item) => item.url?.trim());

      if (socialMediaData.length > 0) {
        await this.socialService.createOrUpdateSocialMediaLinks(
          socialMediaData as socialMediaGroup[]
        );
      }
      const media = this.mediasArray.value[0];
      if (this.mediaToDeleteId && media?.file) {
        await this.publisherService.removeImage(this.mediaToDeleteId);
        console.log('🗑 Old image deleted');

        await this.publisherService.updateMyImage(
          media.file,
          this.publisherId as number
        );
        console.log('⬆ New image uploaded');
      } else if (!this.mediaToDeleteId && media?.file) {
        await this.publisherService.updateMyImage(
          media.file,
          this.publisherId as number
        );
        console.log('📤 New image uploaded (no old media existed)');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Update ticket raised successfully',
        heightAuto: false,
      });
    }
  }

  async onSubmit() {
    try {
      const invalid =
        this.publisherFormGroup.invalid ||
        this.publisherSocialMediaGroup.invalid ||
        this.publisherAddressDetails.invalid ||
        this.publisherBankDetails.invalid;
      if (invalid) {
        this.publisherFormGroup.markAllAsTouched();
        this.publisherSocialMediaGroup.markAllAsTouched();
        this.publisherAddressDetails.markAllAsTouched();
        this.publisherBankDetails.markAllAsTouched();
        await Swal.fire({
          title: 'Error',
          text: 'Please fill all required fields correctly.',
          icon: 'error',
          heightAuto: false,
        });
        console.log(
          this.publisherFormGroup.value,
          this.publisherSocialMediaGroup.value,
          this.publisherAddressDetails.value,
          this.publisherBankDetails.value
        );
        return;
      }
      if (this.publisherBankDetails.hasError('accountMismatch')) {
        await Swal.fire({
          title: 'Error',
          text: 'Account numbers do not match.',
          icon: 'error',
          heightAuto: false,
        });
        return;
      }
      const publisherData = {
        ...this.publisherFormGroup.value,
        pocEmail: this.publisherFormGroup.controls.pocEmail.value,
        userPassword: this.publisherFormGroup.controls.userPassword.value
          ? md5(this.publisherFormGroup.controls.userPassword.value)
          : undefined,
      } as any;
      if (
        this.loggedInUser()?.accessLevel === 'SUPERADMIN' ||
        !this.publisherId
      ) {
        await this.handleNewOrSuperAdminSubmission(publisherData);
      } else {
        await this.handlePublisherUpdateFlow(publisherData);
      }
      if (this.signupCode) {
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/publisher']);
      }
    } catch (error) {
      console.log(error);
    }
  }
}
