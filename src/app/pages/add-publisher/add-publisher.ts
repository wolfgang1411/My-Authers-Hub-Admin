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
  BankDetails,
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
import { NgxMaterialIntlTelInputComponent } from 'ngx-material-intl-tel-input';

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
    NgxMaterialIntlTelInputComponent,
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
  countryISO = CountryISO;

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

  // Computed property to determine submit button text
  submitButtonText = computed(() => {
    const isSuperAdmin = this.loggedInUser()?.accessLevel === 'SUPERADMIN';
    const isNewPublisher = !this.publisherId;
    const publisherStatus = this.publisherDetails?.status;
    const isActivePublisher = publisherStatus === 'Active';

    // When adding a new publisher
    if (isNewPublisher) {
      if (isSuperAdmin) {
        return this.translateService.instant('create') || 'Create';
      }
      return this.translateService.instant('create') || 'Create';
    }

    // Superadmin editing existing publisher
    if (isSuperAdmin) {
      return this.translateService.instant('update') || 'Update';
    }

    // When updating an existing pending publisher → show "Update"
    if (publisherStatus === 'Pending') {
      return this.translateService.instant('update') || 'Update';
    }

    // Active publisher being edited → show "Raise a Ticket"
    if (isActivePublisher) {
      return this.translateService.instant('raiseaticket') || 'Raise a Ticket';
    }

    // Default fallback
    return this.translateService.instant('submit') || 'Submit';
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
      const country = this.publisherAddressDetails.controls?.country?.value;
      const state = this.publisherAddressDetails.controls?.state?.value;
      const isIndia = ['IN', 'INDIA', 'india', 'India', 'in'].includes(
        country || ''
      );

      // Skip async validation if field is empty
      if (!pin || !isIndia) {
        return null;
      }

      // Optional: basic length check (India)
      if (pin?.length !== 6 || !state || !state.length) {
        return { invalidPincode: true };
      }

      try {
        const { valid } = await this.addressService.validatePincode(pin, state);
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
    pocPhoneNumber: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    designation: ['', Validators.required],
    media: this._formBuilder.control<Media | null>(null, Validators.required),
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
      type: new FormControl<SocialMediaType | null>(null),
      url: new FormControl<string | null>(null),
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
  get mediaControl() {
    return this.publisherFormGroup.get('media') as FormControl<Media | null>;
  }

  onMediaAdded(newMedia: Media) {
    const existing = this.mediaControl.value;

    if (existing?.id) {
      this.mediaToDeleteId = existing.id;
    }
    this.mediaControl.setValue({
      ...newMedia,
      id: 0,
      url: '',
    });

    this.mediaControl.updateValueAndValidity();
    console.log('🆕 New media selected', this.mediaControl.value);
  }

  addSocialMedia() {
    this.socialMediaArray.push(
      new FormGroup<SocialMediaGroupType>({
        type: new FormControl<SocialMediaType | null>(null),
        url: new FormControl<string | null>(null),
        publisherId: new FormControl<number | null>(null),
        name: new FormControl<string | null>(null),
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
    if (mediaList?.length > 0) {
      this.mediaControl.setValue(mediaList[0]);
    } else {
      this.mediaControl.setValue(null);
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
        .filter((item) => item.type && item.url?.trim());

      if (socialMediaData.length > 0) {
        await this.socialService.createOrUpdateSocialMediaLinks(
          socialMediaData as socialMediaGroup[]
        );
      }
      const media = this.mediaControl.value;
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
  // Helper method to compare values
  private compareValues(newValue: any, existingValue: any): boolean {
    if (newValue === undefined || newValue === null || newValue === '') {
      return false; // No new value provided, no change
    }
    const newStr = String(newValue).trim();
    const existingStr = existingValue ? String(existingValue).trim() : '';
    return newStr !== existingStr;
  }

  /**
   * Get existing value for a field based on field name
   */
  private getExistingValueForField(
    field: string,
    existingPublisher?: Publishers,
    existingAddress?: Address,
    existingBank?: BankDetails
  ): any {
    const fieldMap: Record<string, () => any> = {
      // Address fields
      address: () => existingAddress?.address,
      city: () => existingAddress?.city,
      state: () => existingAddress?.state,
      country: () => existingAddress?.country,
      pincode: () => existingAddress?.pincode,
      // Bank fields
      bankName: () => existingBank?.name,
      accountHolderName: () => existingBank?.accountHolderName,
      accountNo: () => existingBank?.accountNo,
      ifsc: () => existingBank?.ifsc,
      panCardNo: () => existingBank?.panCardNo,
      accountType: () => existingBank?.accountType,
      gstNumber: () => existingBank?.gstNumber,
      // Publisher fields
      publisherName: () => existingPublisher?.name,
      publisherEmail: () => existingPublisher?.email,
      publisherDesignation: () => existingPublisher?.designation,
      publisherPocName: () =>
        existingPublisher
          ? `${existingPublisher.user?.firstName || ''} ${
              existingPublisher.user?.lastName || ''
            }`.trim()
          : '',
      publisherPocEmail: () => existingPublisher?.user?.email,
      publisherPocPhoneNumber: () => existingPublisher?.user?.phoneNumber,
    };

    const getter = fieldMap[field];
    return getter ? getter() : undefined;
  }

  // Check if publisher details have changed
  private hasPublisherChanges(): boolean {
    if (!this.publisherDetails) return false;

    const newName = this.publisherFormGroup.value.name;
    const newEmail = this.publisherFormGroup.value.email;

    return (
      this.compareValues(newName, this.publisherDetails.name) ||
      this.compareValues(newEmail, this.publisherDetails.email)
    );
  }

  // Check if address has changed
  private hasAddressChanges(): boolean {
    if (!this.publisherDetails?.address?.[0]) return false;

    const existingAddress = this.publisherDetails.address[0];
    const formAddress = this.publisherAddressDetails.value;

    return (
      this.compareValues(formAddress.address, existingAddress.address) ||
      this.compareValues(formAddress.city, existingAddress.city) ||
      this.compareValues(formAddress.state, existingAddress.state) ||
      this.compareValues(formAddress.country, existingAddress.country) ||
      this.compareValues(formAddress.pincode, existingAddress.pincode)
    );
  }

  // Check if bank details have changed
  private hasBankChanges(): boolean {
    if (!this.publisherDetails?.bankDetails?.[0]) return false;

    const existingBank = this.publisherDetails.bankDetails[0];
    const formBank = this.publisherBankDetails.value;

    return (
      this.compareValues(formBank.name, existingBank.name) ||
      this.compareValues(formBank.accountNo, existingBank.accountNo) ||
      this.compareValues(formBank.ifsc, existingBank.ifsc) ||
      this.compareValues(formBank.panCardNo, existingBank.panCardNo) ||
      this.compareValues(formBank.accountType, existingBank.accountType) ||
      this.compareValues(
        formBank.accountHolderName,
        existingBank.accountHolderName
      ) ||
      this.compareValues((formBank as any).gstNumber, existingBank.gstNumber)
    );
  }

  async handlePublisherUpdateFlow(
    publisherData: Publishers
  ): Promise<{ ticketsRaised: boolean; shouldNavigateBack: boolean }> {
    let ticketsRaised = false;

    // Get existing data
    const existingPublisher = this.publisherDetails;
    const existingAddress = existingPublisher?.address?.[0];
    const existingBank = existingPublisher?.bankDetails?.[0];

    const sections = [
      {
        type: UpdateTicketType.ADDRESS,
        fields: ['address', 'city', 'state', 'country', 'pincode'],
        hasChanges: this.hasAddressChanges(),
      },
      {
        type: UpdateTicketType.BANK,
        fields: [
          'bankName',
          'accountHolderName',
          'accountNo',
          'ifsc',
          'panCardNo',
          'accountType',
          'gstNumber',
        ],
        hasChanges: this.hasBankChanges(),
      },
      {
        type: UpdateTicketType.PUBLISHER,
        fields: [
          'publisherName',
          'publisherEmail',
          'publisherDesignation',
          'publisherPocName',
          'publisherPocEmail',
          'publisherPocPhoneNumber',
        ],
        hasChanges: this.hasPublisherChanges(),
      },
    ];

    const rawValue = {
      ...this.publisherAddressDetails.value,
      ...this.publisherBankDetails.value,
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
      console.log(
        `Processing section: ${section.type}, hasChanges: ${section.hasChanges}`
      );

      // Skip if no changes detected for this section
      if (!section.hasChanges) {
        console.log(`⏭️ Skipping ${section.type} - no changes detected`);
        continue;
      }

      const payload: any = { type: section.type };
      let hasValues = false;

      section.fields.forEach((field: string) => {
        const value = rawValue[field as keyof typeof rawValue];
        if (value !== undefined && value !== null && value !== '') {
          // Only include field if it's different from existing value
          const existingValue = this.getExistingValueForField(
            field,
            existingPublisher,
            existingAddress,
            existingBank
          );

          // For publisherPocName, compare by splitting into first/last name parts
          if (field === 'publisherPocName') {
            const newName = String(value).trim();
            const existingName = existingValue
              ? String(existingValue).trim()
              : '';
            const newParts = newName.split(/\s+/);
            const existingParts = existingName.split(/\s+/);
            const newFirstName = newParts[0] || '';
            const newLastName = newParts.slice(1).join(' ') || '';
            const existingFirstName = existingParts[0] || '';
            const existingLastName = existingParts.slice(1).join(' ') || '';

            console.log(`Comparing publisherPocName:`, {
              field,
              newName,
              existingName,
              newFirstName,
              newLastName,
              existingFirstName,
              existingLastName,
              isDifferent:
                newFirstName !== existingFirstName ||
                newLastName !== existingLastName,
            });

            if (
              newFirstName !== existingFirstName ||
              newLastName !== existingLastName
            ) {
              payload[field] = value;
              hasValues = true;
            }
          } else {
            const isDifferent = this.compareValues(value, existingValue);
            console.log(`Comparing ${field}:`, {
              field,
              value,
              existingValue,
              isDifferent,
            });

            if (isDifferent) {
              payload[field] = value;
              hasValues = true;
            }
          }
        }
      });

      console.log(
        `Section ${section.type} payload:`,
        payload,
        `hasValues: ${hasValues}`
      );

      if (hasValues) {
        console.log(`✅ Creating ${section.type} ticket with changes`);
        // Add target IDs when publisher is editing a sub-publisher
        // This ensures the backend knows which entity's address/bank/details to update
        if (this.publisherId) {
          if (section.type === UpdateTicketType.ADDRESS) {
            payload.targetPublisherId = this.publisherId;
          }
          if (section.type === UpdateTicketType.BANK) {
            payload.targetPublisherId = this.publisherId;
          }
          if (section.type === UpdateTicketType.PUBLISHER) {
            payload.publisherId = this.publisherId;
          }
        }

        await this.userService.raisingTicket(payload);
        ticketsRaised = true;
        console.log(`Ticket created successfully for ${section.type}`);
      } else {
        console.log(`No values to include for ${section.type} ticket`);
      }
    }

    const socialMediaData = this.socialMediaArray.controls
      .map((group) => ({
        ...group.value,
        publisherId: this.publisherId,
      }))
      .filter((item) => item.type && item.url?.trim());

    if (socialMediaData.length > 0) {
      await this.socialService.createOrUpdateSocialMediaLinks(
        socialMediaData as socialMediaGroup[]
      );
    }

    const media = this.mediaControl.value;
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

    if (ticketsRaised) {
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Ticket has been raised successfully and sent to Admin for approval .',
        heightAuto: false,
      });
      return { ticketsRaised: true, shouldNavigateBack: false };
    } else {
      // No changes detected - show message with options
      const result = await Swal.fire({
        icon: 'info',
        title: 'No Changes Detected',
        text: 'You have not made any changes to submit.',
        showCancelButton: true,
        confirmButtonText: 'Go Back',
        cancelButtonText: 'Stay Here',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d',
        heightAuto: false,
      });

      if (result.isConfirmed) {
        // User clicked "Go Back"
        return { ticketsRaised: false, shouldNavigateBack: true };
      } else {
        // User clicked "Stay Here" or dismissed
        return { ticketsRaised: false, shouldNavigateBack: false };
      }
    }
  }

  async checkProfileImageAndProceed(stepper?: any) {
    // Check if media is not uploaded
    if (!this.mediaControl.value) {
      await Swal.fire({
        title: 'Profile Image Required',
        text: 'Please upload a profile image to continue.',
        icon: 'error',
        heightAuto: false,
      });
      return false;
    }

    console.log(this.publisherFormGroup);

    if (stepper) {
      stepper.next();
    }
    return true;
  }

  async onSubmit() {
    try {
      // Check profile image first
      if (!this.mediaControl.value) {
        await Swal.fire({
          title: 'Profile Image Required',
          text: 'Please upload a profile image to continue.',
          icon: 'error',
          heightAuto: false,
        });
        return;
      }
      const invalid =
        this.publisherFormGroup.invalid ||
        this.publisherAddressDetails.invalid ||
        this.publisherBankDetails.invalid;
      if (invalid) {
        this.publisherFormGroup.markAllAsTouched();
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
        pocPhoneNumber:
          this.publisherFormGroup.controls.pocPhoneNumber.value?.replaceAll(
            ' ',
            ''
          ),
      } as any;
      let updateFlowResult = {
        ticketsRaised: false,
        shouldNavigateBack: false,
      };

      // Check if publisher is editing their own profile
      const isEditingSelf =
        this.publisherId === this.loggedInUser()?.publisher?.id;

      if (
        this.loggedInUser()?.accessLevel === 'SUPERADMIN' ||
        !this.publisherId
      ) {
        await this.handleNewOrSuperAdminSubmission(publisherData);
      } else {
        // If publisher status is Pending, allow direct update (no tickets needed)
        // Otherwise, raise update ticket
        if (this.publisherDetails?.status === 'Pending') {
          console.log(
            '📝 Publisher is pending - direct update without tickets'
          );
          await this.handleNewOrSuperAdminSubmission(publisherData);
        } else {
          // Existing active/approved publisher being edited → raise tickets
          updateFlowResult = await this.handlePublisherUpdateFlow(
            publisherData
          );
        }
      }
      console.log('🔀 Publisher redirect logic:', {
        signupCode: this.signupCode,
        ticketsRaised: updateFlowResult.ticketsRaised,
        shouldNavigateBack: updateFlowResult.shouldNavigateBack,
        isEditingSelf,
        accessLevel: this.loggedInUser()?.accessLevel,
      });

      if (this.signupCode) {
        console.log('➡️ Redirecting to login (signup flow)');
        this.router.navigate(['/login']);
        return;
      }

      if (updateFlowResult.shouldNavigateBack) {
        console.log('➡️ Going back to previous page');
        window.history.back();
        return;
      }

      if (updateFlowResult.ticketsRaised) {
        if (isEditingSelf) {
          console.log('➡️ Redirecting to profile (self-edit)');
          this.router.navigate(['/profile']);
        } else {
          console.log('➡️ Redirecting to update-tickets (sub-publisher edit)');
          this.router.navigate(['/update-tickets'], {
            queryParams: { tab: 'publisher' },
          });
        }
        return;
      }

      // Direct save (superadmin or new publisher) → redirect to list
      console.log('➡️ Redirecting to publisher list (direct save)');
      this.router.navigate(['/publisher']);
    } catch (error) {
      console.log(error);
    }
  }
}
