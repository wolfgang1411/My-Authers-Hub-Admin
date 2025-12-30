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
import { MatTabsModule } from '@angular/material/tabs';
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
import { PublisherStatus } from '../../interfaces/StaticValue';
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
import { LoaderService } from '../../services/loader';
import { HttpClient } from '@angular/common/http';
import { City, Country, State } from 'country-state-city';
import md5 from 'md5';
import { NgxMaterialIntlTelInputComponent } from 'ngx-material-intl-tel-input';

@Component({
  selector: 'app-add-publisher',
  imports: [
    MatStepperModule,
    MatTabsModule,
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
    private translateService: TranslateService,
    private loader: LoaderService
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
      // In invite flow, don't set publisherId from route id param
      // publisherId should only come from existing publisher found via invite API
      if (signupCode) {
        this.signupCode = signupCode;
        // Don't set publisherId from route in invite flow
        // It will be set when we find existing publisher via invite API
      } else {
        this.publisherId = Number(id) || undefined;
        this.signupCode = undefined;
      }
    });
    this.loggedInUser = this.userService.loggedInUser$;

    // Initialize tab index from query params
    this.route.queryParams.subscribe((params) => {
      const tabIndex = params['tab'] ? Number(params['tab']) : 0;
      if (tabIndex >= 0 && tabIndex < this.TOTAL_TABS) {
        this.currentTabIndex.set(tabIndex);
      }
    });
  }
  countryISO = CountryISO;

  bankOptions = signal<BankOption[]>([]);
  signupCode?: string;
  publisherId?: number;
  publisherDetails = signal<Publishers | undefined>(undefined);
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
  PublisherStatus = PublisherStatus; // Expose PublisherStatus enum to template
  currentTabIndex = signal<number>(0);
  readonly TOTAL_TABS = 3; // Basic Details (with Social Media), Address, Bank Details
  ticketRaisedForTab = signal<{ [tabIndex: number]: boolean }>({}); // Track which tabs raised tickets
  // Total number of available social media platforms: FACEBOOK, TWITTER, INSTAGRAM, LINKEDIN, YOUTUBE, WEBSITE
  readonly TOTAL_SOCIAL_MEDIA_PLATFORMS = 6;
  isAllSelected = computed(() => {
    // Disable "Add More" button only when all platforms are already added
    return this.socialMediaArray.length >= this.TOTAL_SOCIAL_MEDIA_PLATFORMS;
  });

  // Computed property to determine submit button text
  submitButtonText = computed(() => {
    const isSuperAdmin = this.loggedInUser()?.accessLevel === 'SUPERADMIN';
    const isNewPublisher = !this.publisherId;
    const publisherStatus = this.publisherDetails()?.status;
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
    // Ensure signupCode is read from route snapshot first (before route.params subscription)
    // This prevents race conditions where ngOnInit might run before subscription sets signupCode
    const routeParams = this.route.snapshot.params;
    if (routeParams['signupCode']) {
      this.signupCode = routeParams['signupCode'];
    }
    if (routeParams['id'] && !this.signupCode) {
      this.publisherId = Number(routeParams['id']) || undefined;
    }
    
    // Check query params for publisherId (for refresh scenarios after creating new publisher)
    // This allows prefilling form data when user refreshes the page after creating a publisher
    if (!this.publisherId && !this.signupCode) {
      const queryPublisherId = this.route.snapshot.queryParams['publisherId'];
      if (queryPublisherId) {
        this.publisherId = Number(queryPublisherId) || undefined;
      }
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

    const defaultCountryIso = 'IN';
    if (
      !this.publisherId &&
      !this.publisherAddressDetails.get('country')?.value
    ) {
      this.publisherAddressDetails.patchValue({ country: defaultCountryIso });
    }
    this.publisherBankDetails.controls.name.valueChanges.subscribe((v) => {
      this.selectedBankPrefix.set(
        this.bankOptions().find(({ name }) => name === v)?.bankCode || null
      );
    });
    this.bankOptions.set(this.bankDetailService.fetchBankOptions());

    // Handle invite flow: fetch invite and check for existing publisher
    if (this.signupCode) {
      try {
        const invite = await this.inviteService.findOne(this.signupCode);

        // Prefill email from invite
        this.publisherFormGroup.controls.pocEmail.patchValue(invite.email);
        this.publisherFormGroup.controls.pocEmail.disable();

        // Try to fetch existing Dormant publisher by invite code
        // This allows resuming signup flow for Dormant publishers
        const existingPublisher = await this.fetchPublisher();

        if (existingPublisher && existingPublisher.status === PublisherStatus.Dormant) {
          // Set publisherId to enable update flow instead of create flow
          this.publisherId = existingPublisher.id;
          this.publisherDetails.set(existingPublisher);
          this.isPrefilling = true;
          this.prefillForm(existingPublisher);
          this.isPrefilling = false;
        }
      } catch (error) {
        // Invalid invite - error will be shown by service
        console.error('Error fetching invite:', error);
      }
    }

    // Handle normal edit flow (when publisherId is set and no signupCode)
    // IMPORTANT: In invite flow, publisherId might be set after finding existing publisher,
    // but we should NOT fetch here - it's already handled in the invite flow above
    if (this.publisherId && !this.signupCode) {
      const response = await this.fetchPublisher();
      if (response) {
        this.publisherDetails.set(response);
        this.isPrefilling = true;
        this.prefillForm(response);
        this.isPrefilling = false;
      }
    }
  }

  /**
   * Centralized method to fetch publisher - handles all scenarios:
   * 1. Invite flow: ALWAYS use findPublisherByInvite (uses /publishers/by-invite/:signupCode)
   * 2. Normal flow: Use getById normally
   * 
   * @param id - Publisher ID (optional, only used for normal flow)
   * @returns Publisher object or undefined if not found
   */
  /**
   * Centralized method to fetch publisher - handles all scenarios:
   * 1. Invite flow: ALWAYS use findPublisherByInvite (uses /publishers/by-invite/:signupCode)
   * 2. Normal flow: Use getById normally
   * 
   * @param id - Publisher ID (optional, only used for normal flow)
   * @returns Publisher object or undefined if not found
   */
  private async fetchPublisher(id?: number): Promise<Publishers | undefined> {
    try {
      if (this.signupCode) {
        // Invite flow: ALWAYS use the invite API endpoint
        // This uses /publishers/by-invite/:signupCode which works for any status
        const publisher = await this.publisherService.findPublisherByInvite(this.signupCode);
        if (publisher) {
          return publisher;
        }
        // If no publisher found, return undefined (don't throw error)
        return undefined;
      } else {
        // Normal flow - require publisherId
        const publisherId = id || this.publisherId;
        if (!publisherId) {
          return undefined;
        }
        return await this.publisherService.getPublisherById(publisherId);
      }
    } catch (error) {
      // Log error but don't throw - return undefined to allow graceful handling
      console.error('Error fetching publisher:', error);
      return undefined;
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

  gstValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      // GST format: 15 characters, 2 state code + 10 PAN + 3 check digits
      // Format: [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;

      return gstRegex.test(control.value.toUpperCase())
        ? null
        : { invalidGst: true };
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
      gstNumber: ['', [this.gstValidator()]],
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

    // If newMedia has an id > 0, it's a prefill from API - keep it as is
    if (newMedia.id && newMedia.id > 0) {
      // This is a prefill from API - keep the original media object
      this.mediaControl.setValue(newMedia);
      this.mediaToDeleteId = newMedia.id;
    } else {
      // This is a new file upload
      if (existing?.id) {
        this.mediaToDeleteId = existing.id;
      }
      this.mediaControl.setValue({
        ...newMedia,
        id: 0,
        url: '',
      });
    }

    this.mediaControl.updateValueAndValidity();
    console.log('🆕 Media updated', this.mediaControl.value);
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

    // Prefill address if it exists
    const addr = publisherDetails.address?.[0];
    if (addr) {
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
        this.cities.find(
          (c) => c.name.toLowerCase() === addr.city?.toLowerCase()
        )?.name || '';

      this.publisherAddressDetails.patchValue({
        city: cityName,
        pincode: addr.pincode,
      });
    }

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
      gstNumber: publisherDetails.bankDetails?.[0]?.gstNumber,
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
      // Find media with type LOGO (publisher logo) or use first media
      const logoMedia =
        mediaList.find((m) => (m as any).type === 'LOGO') || mediaList[0];
      // Store the media ID for potential deletion if user uploads new image
      if (logoMedia.id) {
        this.mediaToDeleteId = logoMedia.id;
      }
      // Set the media control - the upload-file component will handle displaying it
      // and emit it back via mediaAdded event
      this.mediaControl.setValue(logoMedia as Media);
    } else {
      this.mediaControl.setValue(null);
      this.mediaToDeleteId = null;
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
    // Always pass signupCode if present (for invite flow)
    const response = (await this.publisherService.createPublisher(
      publisherData,
      this.signupCode
    )) as Publishers;
    this.publisherId = response.id;

    if (response && response.id) {
      const publisherAddressData = {
        ...this.publisherAddressDetails.value,
        publisherId: response.id,
      };

      // In invite flow, always use CREATE (remove id) but still prefill form
      const addressPayload: any = {
        ...publisherAddressData,
      };
      if (this.signupCode) {
        addressPayload.id = undefined;
      }
      await this.addressService.createOrUpdateAddress(addressPayload as Address);

      const bankDetailsValue = { ...this.publisherBankDetails.value };
      // Remove gstNumber if empty, otherwise keep it
      if (
        !bankDetailsValue.gstNumber ||
        (typeof bankDetailsValue.gstNumber === 'string' &&
          bankDetailsValue.gstNumber.trim() === '')
      ) {
        delete bankDetailsValue.gstNumber;
      }
      // In invite flow, always use CREATE (remove id) but still prefill form
      const publisherBankData: any = {
        ...bankDetailsValue,
        publisherId: response.id,
      };
      if (this.signupCode) {
        publisherBankData.id = undefined;
      }

      await this.bankDetailService.createOrUpdateBankDetail(
        publisherBankData as createBankDetails
      );
      const socialMediaData = this.socialMediaArray.controls
        .map((group) => {
          const value = group.value;
          const socialMediaItem: any = {
            type: value.type,
            url: value.url,
            publisherId: response.id,
            name: value.name,
            autherId: value.autherId,
          };
          // In invite flow, always use CREATE (remove id) and add signupCode
          // Otherwise, include id only if it's a valid number
          if (!this.signupCode && value.id && typeof value.id === 'number') {
            socialMediaItem.id = value.id;
          }
          if (this.signupCode) {
            socialMediaItem.signupCode = this.signupCode;
          }
          return socialMediaItem;
        })
        .filter((item) => item.type && item.url?.trim());

      if (socialMediaData.length > 0) {
        await this.socialService.createOrUpdateSocialMediaLinks(
          socialMediaData as socialMediaGroup[]
        );

        // Reload publisher details to get updated social media with IDs
        const updatedPublisher = await this.fetchPublisher(response.id);
        if (updatedPublisher) {
          this.publisherDetails.set(updatedPublisher);

          // Update form with IDs from saved social media to enable PATCH on next save
          const socialMediaArray = this.publisherSocialMediaGroup.get(
            'socialMedia'
          ) as FormArray<FormGroup<SocialMediaGroupType>>;
          const savedSocialMedia = updatedPublisher.socialMedias || [];

          // Match and update IDs in form controls
          socialMediaArray.controls.forEach((control) => {
            const formValue = control.value;
            const savedItem = savedSocialMedia.find(
              (saved) =>
                saved.type === formValue.type &&
                saved.url?.trim() === formValue.url?.trim()
            );
            if (savedItem?.id) {
              control.patchValue({ id: savedItem.id });
            }
          });
        }
      }
      const media = this.mediaControl.value;
      if (this.mediaToDeleteId && media?.file) {
        await this.publisherService.removeImage(this.mediaToDeleteId);
        console.log('🗑 Old image deleted');

        await this.publisherService.updateMyImage(media.file, response.id, this.signupCode);
        console.log('⬆ New image uploaded');
      } else if (!this.mediaToDeleteId && media?.file) {
        await this.publisherService.updateMyImage(media.file, response.id, this.signupCode);
        console.log('📤 New image uploaded (no old media existed)');
      }
    }

    let html = 'You have successfully created the publisher.';

    if (response?.id) {
      html = 'You have successfully updated the publisher.';
    }

    if (this.signupCode) {
      html = this.translateService.instant('registeredAsPublisher') || 'You have been registered as a publisher. Please verify your email. A verification link has been sent to your email address.';
    }

    await Swal.fire({
      title: 'Success',
      icon: 'success',
      html,
      heightAuto: false,
    });
  }
  /**
   * Helper method to check if user can update directly (without tickets)
   * Superadmins can always update directly
   * Invite flow (signupCode present) can always update directly
   * Publishers can update directly if status is Pending or Dormant
   * New publishers (no publisherId) can always be created directly
   */
  private canUpdateDirectly(): boolean {
    // Invite flow always allows direct updates
    if (this.signupCode) {
      return true;
    }
    const isSuperAdmin = this.loggedInUser()?.accessLevel === 'SUPERADMIN';
    if (isSuperAdmin) {
      return true; // Superadmin can always update directly
    }
    if (!this.publisherId) {
      return true; // New publisher can always be created directly
    }
    const status = this.publisherDetails()?.status;
    return status === PublisherStatus.Pending || status === PublisherStatus.Dormant;
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
    const details = this.publisherDetails();
    if (!details) return false;

    const formValue = this.publisherFormGroup.value;
    const pocName = formValue.pocName || '';
    const nameParts = pocName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Normalize phone number for comparison (remove spaces, same as when saving)
    const normalizedPhoneNumber =
      formValue.pocPhoneNumber?.replaceAll?.(' ', '') ||
      formValue.pocPhoneNumber;
    const normalizedExistingPhone =
      details.user?.phoneNumber?.replaceAll?.(' ', '') ||
      details.user?.phoneNumber;

    return (
      this.compareValues(formValue.name, details.name) ||
      this.compareValues(formValue.email, details.email) ||
      this.compareValues(formValue.designation, details.designation) ||
      this.compareValues(firstName, details.user?.firstName) ||
      this.compareValues(lastName, details.user?.lastName) ||
      this.compareValues(formValue.pocEmail, details.user?.email) ||
      this.compareValues(normalizedPhoneNumber, normalizedExistingPhone)
    );
  }

  // Check if media has changes
  private hasMediaChanges(existingMedia: Media | undefined): boolean {
    const newMedia = this.mediaControl.value;

    // If no new file is uploaded, there's no change
    if (!newMedia?.file) {
      return false; // No new file, no change
    }

    // If there's a new file but no existing media, it's a change
    if (!existingMedia) {
      return true; // New file and no existing media = change
    }

    // Compare file name and size only if we have both
    // If sizes don't match or names don't match, it's a change
    const existingSize = (existingMedia as any)?.size;
    const existingName = existingMedia?.name;

    // If we can't compare (missing size info), consider it a change to be safe
    if (existingSize === undefined && existingName) {
      // If existing has a name but new file has different name, it's a change
      return newMedia.file.name !== existingName;
    }

    // Compare both name and size
    return (
      newMedia.file.name !== existingName || newMedia.file.size !== existingSize
    );
  }

  // Check if social media has changes
  private hasSocialMediaChanges(
    existingSocialMedia: socialMediaGroup[]
  ): boolean {
    const newSocialMedia = this.socialMediaArray.controls
      .map((group) => ({
        type: group.value.type,
        url: group.value.url?.trim() || '',
      }))
      .filter((item) => item.type && item.url);

    const existing = (existingSocialMedia || []).map((item) => ({
      type: item.type,
      url: item.url?.trim() || '',
    }));

    if (newSocialMedia.length !== existing.length) {
      return true;
    }

    // Sort both arrays for comparison
    const sortedNew = [...newSocialMedia].sort((a, b) =>
      `${a.type}-${a.url}`.localeCompare(`${b.type}-${b.url}`)
    );
    const sortedExisting = [...existing].sort((a, b) =>
      `${a.type}-${a.url}`.localeCompare(`${b.type}-${b.url}`)
    );

    return sortedNew.some(
      (newItem, index) =>
        newItem.type !== sortedExisting[index]?.type ||
        newItem.url !== sortedExisting[index]?.url
    );
  }

  // Check if address has changed (for ticket comparison)
  private hasAddressChanges(existingAddress?: Address): boolean {
    if (!existingAddress) {
      // If no existing address, check if form has values
      const formValue = this.publisherAddressDetails.value;
      return !!(
        formValue.address ||
        formValue.city ||
        formValue.state ||
        formValue.country ||
        formValue.pincode
      );
    }

    const formAddress = this.publisherAddressDetails.value;

    return (
      this.compareValues(formAddress.address, existingAddress.address) ||
      this.compareValues(formAddress.city, existingAddress.city) ||
      this.compareValues(formAddress.state, existingAddress.state) ||
      this.compareValues(formAddress.country, existingAddress.country) ||
      this.compareValues(formAddress.pincode, existingAddress.pincode)
    );
  }

  // Check if bank details have changed (for ticket comparison)
  private hasBankChanges(existingBank?: BankDetails): boolean {
    if (!existingBank) {
      // If no existing bank, check if form has values
      const formValue = this.publisherBankDetails.value;
      return !!(
        formValue.name ||
        formValue.accountNo ||
        formValue.ifsc ||
        formValue.panCardNo ||
        formValue.accountType ||
        formValue.accountHolderName
      );
    }

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
    const existingPublisher = this.publisherDetails();
    const existingAddress = existingPublisher?.address?.[0];
    const existingBank = existingPublisher?.bankDetails?.[0];

    const sections = [
      {
        type: UpdateTicketType.ADDRESS,
        fields: ['address', 'city', 'state', 'country', 'pincode'],
        hasChanges: this.hasAddressChanges(existingAddress),
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
        hasChanges: this.hasBankChanges(existingBank),
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

    const bankDetailsValue = { ...this.publisherBankDetails.value };
    // Remove gstNumber if empty, otherwise keep it
    if (
      !bankDetailsValue.gstNumber ||
      bankDetailsValue.gstNumber.trim() === ''
    ) {
      delete bankDetailsValue.gstNumber;
    }
    const rawValue = {
      ...this.publisherAddressDetails.value,
      ...bankDetailsValue,
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
      .map((group) => {
        const value = group.value;
        const socialMediaItem: any = {
          ...value,
          publisherId: this.publisherId,
        };
        // In invite flow, always use CREATE (remove id) and add signupCode
        if (this.signupCode) {
          socialMediaItem.id = undefined;
          socialMediaItem.signupCode = this.signupCode;
        }
        return socialMediaItem;
      })
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
        this.publisherId as number,
        this.signupCode
      );
      console.log('⬆ New image uploaded');
    } else if (!this.mediaToDeleteId && media?.file) {
      await this.publisherService.updateMyImage(
        media.file,
        this.publisherId as number,
        this.signupCode
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
        // If publisher status is Pending or Dormant, allow direct update (no tickets needed)
        // Otherwise, raise update ticket
        const status = this.publisherDetails()?.status;
        if (status === 'Pending' || status === 'Dormant') {
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
      // Error handled by service
    }
  }

  // Tab navigation methods
  goToTab(index: number) {
    if (index >= 0 && index < this.TOTAL_TABS) {
      this.currentTabIndex.set(index);
      this.updateQueryParams({ tab: index.toString() });
    }
  }

  onTabChange(index: number) {
    this.goToTab(index);
  }

  nextTab() {
    if (this.currentTabIndex() < this.TOTAL_TABS - 1) {
      this.goToTab(this.currentTabIndex() + 1);
    }
  }

  prevTab() {
    if (this.currentTabIndex() > 0) {
      this.goToTab(this.currentTabIndex() - 1);
    }
  }

  updateQueryParams(params: { [key: string]: any }) {
    // Exclude signupCode from query params - it should only be in route params
    const { signupCode, ...queryParams } = params;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
    });
  }

  // Get action button text for current tab (combines action + navigation)
  getActionButtonText(): string {
    const currentTab = this.currentTabIndex();
    const canUpdateDirectly = this.canUpdateDirectly();

    let actionText = '';
    let navigationText = '';

    // Determine action text
    switch (currentTab) {
      case 0: // Basic Details
        if (!this.publisherId) {
          actionText = this.translateService.instant('create') || 'Create';
        } else if (canUpdateDirectly) {
          actionText = this.translateService.instant('update') || 'Update';
        } else {
          actionText =
            this.translateService.instant('raiseaticket') || 'Raise Ticket';
        }
        break;

      case 1: // Address
        const existingAddress = this.publisherDetails()?.address?.[0];
        if (!existingAddress) {
          actionText = this.translateService.instant('create') || 'Create';
        } else if (canUpdateDirectly) {
          actionText = this.translateService.instant('update') || 'Update';
        } else {
          actionText =
            this.translateService.instant('raiseaticket') || 'Raise Ticket';
        }
        break;

      case 2: // Bank Details
        const existingBank = this.publisherDetails()?.bankDetails?.[0];
        if (!existingBank) {
          actionText = this.translateService.instant('create') || 'Create';
        } else if (canUpdateDirectly) {
          actionText = this.translateService.instant('update') || 'Update';
        } else {
          actionText =
            this.translateService.instant('raiseaticket') || 'Raise Ticket';
        }
        break;

      default:
        return '';
    }

    // Determine navigation text
    if (currentTab === this.TOTAL_TABS - 1) {
      // Last tab
      if (this.ticketRaisedForTab()[currentTab]) {
        navigationText =
          this.translateService.instant('viewticket') || 'View Ticket';
      } else {
        navigationText = this.translateService.instant('back') || 'Back';
      }
    } else {
      // Not last tab
      navigationText = this.translateService.instant('next') || 'Next';
    }

    // Combine action and navigation text
    return `${actionText} and ${navigationText}`;
  }

  // Get action button icon
  getActionButtonIcon(): string {
    const currentTab = this.currentTabIndex();

    if (currentTab === this.TOTAL_TABS - 1) {
      // Last tab
      if (this.ticketRaisedForTab()[currentTab]) {
        return 'visibility';
      }
      return 'arrow_back';
    }

    // Not last tab
    return 'arrow_forward';
  }

  // Check if current tab is valid
  isCurrentTabValid(): boolean {
    const currentTab = this.currentTabIndex();

    switch (currentTab) {
      case 0: // Basic Details (includes Social Media)
        return this.publisherFormGroup.valid && !!this.mediaControl.value;
      case 1: // Address
        return this.publisherAddressDetails.valid;
      case 2: // Bank Details
        return (
          this.publisherBankDetails.valid &&
          !this.publisherBankDetails.hasError('accountMismatch')
        );
      default:
        return false;
    }
  }

  // Handle tab-specific save/next action
  async handleTabAction() {
    const currentTab = this.currentTabIndex();

    // Validate current tab
    if (!this.isCurrentTabValid()) {
      // Mark current tab form as touched
      switch (currentTab) {
        case 0:
          this.publisherFormGroup.markAllAsTouched();
          if (!this.mediaControl.value) {
            await Swal.fire({
              title: 'Profile Image Required',
              text: 'Please upload a profile image to continue.',
              icon: 'error',
              heightAuto: false,
            });
          }
          break;
        case 1:
          this.publisherAddressDetails.markAllAsTouched();
          break;
        case 2:
          this.publisherBankDetails.markAllAsTouched();
          if (this.publisherBankDetails.hasError('accountMismatch')) {
            await Swal.fire({
              title: 'Error',
              text: 'Account numbers do not match.',
              icon: 'error',
              heightAuto: false,
            });
          }
          break;
      }
      return;
    }

    // Save current tab data - let services handle errors
    let result: boolean | null = false;
    switch (currentTab) {
      case 0:
        result = await this.saveBasicDetailsTab();
        // Only move to next tab if result is false (direct update)
        if (result === false) {
          this.nextTab();
        }
        // If result is null, no changes detected - stay on current tab
        // If result is true, navigation occurred - don't change tab
        break;
      case 1:
        result = await this.saveAddressTab();
        // Only move to next tab if result is false (direct update)
        if (result === false) {
          this.nextTab();
        }
        // If result is null, no changes detected - stay on current tab
        // If result is true, navigation occurred - don't change tab
        break;
      case 2:
        result = await this.saveBankDetailsTab();
        // saveBankDetailsTab handles navigation (goBack() for tickets, or direct redirect)
        // If result is null, no changes detected - stay on current tab
        break;
    }
  }

  goBack() {
    this.router.navigate(['/publisher']);
  }

  // Save Basic Details Tab
  // Order: 1. Basic Details (Publisher info) → 2. Media → 3. Social Media
  async saveBasicDetailsTab() {
    // If signupCode exists, don't include id (force POST/create)
    const publisherData: any = {
      ...this.publisherFormGroup.value,
      pocEmail: this.publisherFormGroup.controls.pocEmail.value,
      pocPhoneNumber:
        this.publisherFormGroup.controls.pocPhoneNumber.value?.replaceAll(
          ' ',
          ''
        ),
    };
    // Only include id if no signupCode (allow PATCH/update)
    if (!this.signupCode) {
      publisherData.id = this.publisherId || this.publisherFormGroup.value.id;
    }

    if (this.canUpdateDirectly()) {
      // Step 1: Create/Update Basic Details (Publisher info)
      // Always pass signupCode if present (for invite flow)
      const response = (await this.publisherService.createPublisher(
        publisherData,
        this.signupCode
      )) as Publishers;

      // Store publisherId if it's a new publisher
      const wasNewPublisher = !this.publisherId;
      const finalPublisherId = response?.id || this.publisherId;
      if (!this.publisherId && response?.id) {
        this.publisherId = response.id;
        // Update query params (but not in invite flow - signupCode should not be in query params)
        if (!this.signupCode) {
          this.updateQueryParams({ publisherId: response.id.toString() });
        }

        // Reload publisher details (always use invite API if signupCode is present)
        const updatedPublisher = await this.fetchPublisher(response.id);
        if (updatedPublisher) {
          this.publisherDetails.set(updatedPublisher);
        }
      }

      // Step 2: Save Media (after basic details)
      const media = this.mediaControl.value;
      if (finalPublisherId && media?.file) {
        if (this.mediaToDeleteId) {
          await this.publisherService.removeImage(this.mediaToDeleteId);
        }
        // Wrap media upload in loader to keep it active during upload
        await this.loader.loadPromise(
          this.publisherService.updateMyImage(media.file, finalPublisherId, this.signupCode),
          'upload-media'
        );
      }

      // Step 3: Save Social Media (after media)
      if (finalPublisherId) {
        const socialMediaData = this.socialMediaArray.controls
          .map((group) => {
            const value = group.value;
            const socialMediaItem: any = {
              type: value.type,
              url: value.url,
              publisherId: finalPublisherId,
              name: value.name,
              autherId: value.autherId,
            };
            // In invite flow, always use CREATE (remove id) and add signupCode
            // Otherwise, include id only if it's a valid number
            if (!this.signupCode && value.id && typeof value.id === 'number') {
              socialMediaItem.id = value.id;
            }
            if (this.signupCode) {
              socialMediaItem.signupCode = this.signupCode;
            }
            return socialMediaItem;
          })
          .filter((item) => item.type && item.url?.trim());

        if (socialMediaData.length > 0) {
          await this.socialService.createOrUpdateSocialMediaLinks(
            socialMediaData as socialMediaGroup[]
          );

          // Reload publisher details to get updated social media with IDs
          // This ensures form state is preserved for PATCH operations later
          const updatedPublisher = await this.fetchPublisher(
            finalPublisherId
          );
          if (updatedPublisher) {
            this.publisherDetails.set(updatedPublisher);

            // Update form with IDs from saved social media to enable PATCH on next save
            const socialMediaArray = this.publisherSocialMediaGroup.get(
              'socialMedia'
            ) as FormArray<FormGroup<SocialMediaGroupType>>;
            const savedSocialMedia = updatedPublisher.socialMedias || [];

            // Match and update IDs in form controls
            socialMediaArray.controls.forEach((control) => {
              const formValue = control.value;
              const savedItem = savedSocialMedia.find(
                (saved) =>
                  saved.type === formValue.type &&
                  saved.url?.trim() === formValue.url?.trim()
              );
              if (savedItem?.id) {
                control.patchValue({ id: savedItem.id });
              }
            });
          }
        }
      }

      // Clear ticket flag for this tab on successful direct update
      this.ticketRaisedForTab.update((prev) => {
        const updated = { ...prev };
        delete updated[0];
        return updated;
      });

      // Success popup removed - only show on last tab (bank details)
      return false; // No navigation occurred, direct update
    } else {
      // Raise ticket for Active publishers (ALL Active need tickets, even SuperAdmin)
      const existingPublisher = this.publisherDetails();
      const hasPublisherChange = existingPublisher
        ? this.hasPublisherChanges()
        : false;
      const existingMedia = existingPublisher?.medias?.[0];
      const hasMediaChange = this.hasMediaChanges(existingMedia);
      const existingSocialMedia = existingPublisher?.socialMedias || [];
      const hasSocialMediaChange =
        this.hasSocialMediaChanges(existingSocialMedia);

      // Debug logging to identify what's triggering the change
      console.log('Change detection for Publisher Basic Details:', {
        hasPublisherChange,
        hasMediaChange,
        hasSocialMediaChange,
        formPhoneNumber: this.publisherFormGroup.value.pocPhoneNumber,
        existingPhoneNumber: existingPublisher?.user?.phoneNumber,
        formName: this.publisherFormGroup.value.name,
        existingName: existingPublisher?.name,
        formEmail: this.publisherFormGroup.value.email,
        existingEmail: existingPublisher?.email,
        formDesignation: this.publisherFormGroup.value.designation,
        existingDesignation: existingPublisher?.designation,
        formPocName: this.publisherFormGroup.value.pocName,
        existingPocName: existingPublisher
          ? `${existingPublisher.user?.firstName || ''} ${
              existingPublisher.user?.lastName || ''
            }`.trim()
          : 'N/A',
        formPocEmail: this.publisherFormGroup.value.pocEmail,
        existingPocEmail: existingPublisher?.user?.email,
        newMediaFile: this.mediaControl.value?.file?.name,
        existingMediaName: existingMedia?.name,
      });

      // Only raise PUBLISHER ticket for publisher details or media changes, NOT social media
      // When raising tickets, do NOT update social media - keep it in form state only
      // Social media will be saved when the ticket is approved or on direct update
      if (hasPublisherChange || hasMediaChange) {
        const pocName = this.publisherFormGroup.value.pocName || '';
        const nameParts = pocName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const payload: any = {
          type: UpdateTicketType.PUBLISHER,
          publisherId: this.publisherId,
          publisherName: this.publisherFormGroup.value.name,
          publisherEmail: this.publisherFormGroup.value.email,
          publisherDesignation: this.publisherFormGroup.value.designation,
          publisherPocName: pocName,
          publisherPocEmail: this.publisherFormGroup.value.pocEmail,
          publisherPocPhoneNumber: this.publisherFormGroup.value.pocPhoneNumber,
        };

        await this.userService.raisingTicket(payload);

        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Ticket created',
          heightAuto: false,
        });

        // Navigate back to publishers list after successful ticket raise
        // Do NOT proceed to next tab when raising tickets
        this.goBack();
        return true; // Indicate that navigation occurred
      } else if (hasSocialMediaChange) {
        // Only social media changes detected
        // Social media doesn't require tickets - update directly
        // But since we're in ticket-raising mode, go back instead of proceeding to next tab
        if (this.publisherId) {
          const socialMediaData = this.socialMediaArray.controls
            .map((group) => {
              const value = group.value;
              const socialMediaItem: any = {
                type: value.type,
                url: value.url,
                publisherId: this.publisherId,
                name: value.name,
                autherId: value.autherId,
              };
              // In invite flow, always use CREATE (remove id) and add signupCode
              // Otherwise, include id only if it's a valid number
              if (!this.signupCode && value.id && typeof value.id === 'number') {
                socialMediaItem.id = value.id;
              }
              if (this.signupCode) {
                socialMediaItem.signupCode = this.signupCode;
              }
              return socialMediaItem;
            })
            .filter((item) => item.type && item.url?.trim());

          if (socialMediaData.length > 0) {
            await this.socialService.createOrUpdateSocialMediaLinks(
              socialMediaData as socialMediaGroup[]
            );

            // Reload publisher details to get updated social media with IDs
            // This ensures form state is preserved for PATCH operations later
            const updatedPublisher =
              await this.fetchPublisher(this.publisherId);
            if (updatedPublisher) {
              this.publisherDetails.set(updatedPublisher);

              // Update form with IDs from saved social media to enable PATCH on next save
              const socialMediaArray = this.publisherSocialMediaGroup.get(
                'socialMedia'
              ) as FormArray<FormGroup<SocialMediaGroupType>>;
              const savedSocialMedia = updatedPublisher.socialMedias || [];

              // Match and update IDs in form controls
              socialMediaArray.controls.forEach((control) => {
                const formValue = control.value;
                const savedItem = savedSocialMedia.find(
                  (saved) =>
                    saved.type === formValue.type &&
                    saved.url?.trim() === formValue.url?.trim()
                );
                if (savedItem?.id) {
                  control.patchValue({ id: savedItem.id });
                }
              });
            }
          }
        }
        // Go back instead of proceeding to next tab when in ticket mode
        this.goBack();
        return true; // Navigation occurred, don't proceed with tab change
      } else {
        // No changes detected
        await Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'No change for update ticket',
          heightAuto: false,
        });
        return null; // No changes detected, don't proceed with tab change
      }
    }
    return false; // No navigation occurred, but proceed with tab change (direct update)
  }

  // Save Address Tab
  async saveAddressTab() {
    // For new publishers, publisherId should be set from tab 0
    // But if somehow it's not set, try to get it from query params or invite API
    if (!this.publisherId) {
      if (this.signupCode) {
        // In invite flow, fetch using invite API
        try {
          const existingPublisher = await this.fetchPublisher();
          if (existingPublisher && existingPublisher.id) {
            this.publisherId = existingPublisher.id;
            this.publisherDetails.set(existingPublisher);
          }
        } catch (error) {
          // No existing publisher - continue with new publisher flow
        }
      } else {
      // Normal flow - try query params
        const queryPublisherId = this.route.snapshot.queryParams['publisherId'];
        if (queryPublisherId) {
          this.publisherId = Number(queryPublisherId);
          const updatedPublisher = await this.fetchPublisher(this.publisherId);
          if (updatedPublisher) {
            this.publisherDetails.set(updatedPublisher);
          }
        }
      }

      if (!this.publisherId) {
        await Swal.fire({
          title: 'Error',
          text: 'Please complete Basic Details first.',
          icon: 'error',
          heightAuto: false,
        });
        this.goToTab(0);
        return false; // No navigation occurred, go to first tab
      }
    }

    if (this.canUpdateDirectly()) {
      // Create or update address directly
      const existingPublisher = this.publisherDetails();
      const existingAddress = existingPublisher?.address?.[0];
      const wasNewAddress = !existingAddress;

      // In invite flow, always use CREATE (remove id) but still prefill form
      const addressPayload: any = {
        ...this.publisherAddressDetails.value,
        publisherId: this.publisherId,
      };
      // Remove id if signupCode is present (force CREATE)
      if (this.signupCode) {
        addressPayload.id = undefined;
      } else {
        addressPayload.id = existingAddress?.id;
      }
      await this.addressService.createOrUpdateAddress(addressPayload as Address);

      // Reload publisher details to get updated address
      const updatedPublisher = await this.fetchPublisher(this.publisherId);
      if (updatedPublisher) {
        this.publisherDetails.set(updatedPublisher);
      }

      // Clear ticket flag for this tab on successful direct update
      this.ticketRaisedForTab.update((prev) => {
        const updated = { ...prev };
        delete updated[1];
        return updated;
      });

      // Success popup removed - only show on last tab (bank details)
      return false; // No navigation occurred, direct update
    } else {
      // Raise ticket for Active publishers
      const existingPublisher = this.publisherDetails();
      const existingAddress = existingPublisher?.address?.[0];
      const hasAddressChange = this.hasAddressChanges(existingAddress);

      if (hasAddressChange) {
        const payload: any = {
          type: UpdateTicketType.ADDRESS,
          targetPublisherId: this.publisherId,
          address: this.publisherAddressDetails.value.address,
          city: this.publisherAddressDetails.value.city,
          state: this.publisherAddressDetails.value.state,
          country: this.publisherAddressDetails.value.country,
          pincode: this.publisherAddressDetails.value.pincode,
        };

        await this.userService.raisingTicket(payload);

        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Ticket created',
          heightAuto: false,
        });

        // Navigate back to publishers list after successful ticket raise
        this.goBack();
        return true; // Indicate that navigation occurred
      } else {
        // No changes detected
        await Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'No change for update ticket',
          heightAuto: false,
        });
        return null; // No changes detected, don't proceed with tab change
      }
    }
    return false; // No navigation occurred, but proceed with tab change (direct update)
  }

  // Save Bank Details Tab
  async saveBankDetailsTab(): Promise<boolean | null> {
    // For new publishers, publisherId should be set from tab 0
    // But if somehow it's not set, try to get it from query params or invite API
    if (!this.publisherId) {
      if (this.signupCode) {
        // In invite flow, fetch using invite API
        try {
          const existingPublisher = await this.fetchPublisher();
          if (existingPublisher && existingPublisher.id) {
            this.publisherId = existingPublisher.id;
            this.publisherDetails.set(existingPublisher);
          }
        } catch (error) {
          // No existing publisher - continue with new publisher flow
        }
      } else {
      // Normal flow - try query params
        const queryPublisherId = this.route.snapshot.queryParams['publisherId'];
        if (queryPublisherId) {
          this.publisherId = Number(queryPublisherId);
          const updatedPublisher = await this.fetchPublisher(this.publisherId);
          if (updatedPublisher) {
            this.publisherDetails.set(updatedPublisher);
          }
        }
      }

      if (!this.publisherId) {
        await Swal.fire({
          title: 'Error',
          text: 'Please complete Basic Details first.',
          icon: 'error',
          heightAuto: false,
        });
        this.goToTab(0);
        return false; // No navigation occurred, go to first tab
      }
    }

    if (this.canUpdateDirectly()) {
      // Create or update bank details directly
      const existingPublisher = this.publisherDetails();
      const existingBank = existingPublisher?.bankDetails?.[0];
      const wasNewBank = !existingBank;

      const bankDetailsValue = { ...this.publisherBankDetails.value };
      if (
        !bankDetailsValue.gstNumber ||
        (typeof bankDetailsValue.gstNumber === 'string' && bankDetailsValue.gstNumber.trim() === '')
      ) {
        delete bankDetailsValue.gstNumber;
      }

      // In invite flow, always use CREATE (remove id) but still prefill form
      const bankPayload: any = {
        ...bankDetailsValue,
        publisherId: this.publisherId,
      };
      // Remove id if signupCode is present (force CREATE)
      if (this.signupCode) {
        bankPayload.id = undefined;
      } else {
        bankPayload.id = existingBank?.id;
      }
      await this.bankDetailService.createOrUpdateBankDetail(bankPayload as createBankDetails);

      // Reload publisher details to get updated bank details
      const updatedPublisher = await this.fetchPublisher(this.publisherId);
      if (updatedPublisher) {
        this.publisherDetails.set(updatedPublisher);
      }

      // Clear ticket flag for this tab on successful direct update
      this.ticketRaisedForTab.update((prev) => {
        const updated = { ...prev };
        delete updated[2];
        return updated;
      });

      // Show different message for invite flow
      if (this.signupCode) {
        await Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success') || 'Success',
          text: this.translateService.instant('applicationSentForApproval') || 'Your application has been sent for superadmin approval. Please verify your email in the meantime.',
          heightAuto: false,
        });
      } else {
        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: wasNewBank
            ? 'Bank details created successfully'
            : 'Bank details updated successfully',
          heightAuto: false,
        });
      }

      // Redirect after final save (only for direct updates, not tickets)
      if (this.signupCode) {
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/publisher']);
      }
      return true; // Navigation occurred
    } else {
      // Raise ticket for Active publishers
      const existingPublisher = this.publisherDetails();
      const existingBank = existingPublisher?.bankDetails?.[0];
      const hasBankChange = this.hasBankChanges(existingBank);

      if (hasBankChange) {
        const bankDetailsValue = { ...this.publisherBankDetails.value };
        if (
          !bankDetailsValue.gstNumber ||
          (typeof bankDetailsValue.gstNumber === 'string' && bankDetailsValue.gstNumber.trim() === '')
        ) {
          delete bankDetailsValue.gstNumber;
        }

        const payload: any = {
          type: UpdateTicketType.BANK,
          targetPublisherId: this.publisherId,
          bankName: bankDetailsValue.name,
          accountHolderName: bankDetailsValue.accountHolderName,
          accountNo: bankDetailsValue.accountNo,
          ifsc: bankDetailsValue.ifsc,
          panCardNo: bankDetailsValue.panCardNo,
          accountType: bankDetailsValue.accountType,
          gstNumber: bankDetailsValue.gstNumber,
        };

        await this.userService.raisingTicket(payload);

        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Ticket created',
          heightAuto: false,
        });

        // Navigate back to publishers list after successful ticket raise
        this.goBack();
        return true; // Indicate that navigation occurred
      } else {
        // No changes detected
        await Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'No change for update ticket',
          heightAuto: false,
        });
        return null; // No changes detected, don't proceed with tab change
      }
    }
    return false; // No navigation occurred, but proceed with tab change (direct update)
  }

  openPassword() {
    const oldInput = document.getElementById('password') as HTMLInputElement;
    if (oldInput.type === 'password') {
      oldInput.type = 'text';
    } else {
      oldInput.type = 'password';
    }
  }
}
