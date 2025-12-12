import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormGroup,
  FormArray,
  FormControl,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  AsyncValidatorFn,
} from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  StepperOrientation,
  MatStepperModule,
} from '@angular/material/stepper';
import { Observable, of } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { UploadFile } from '../../components/upload-file/upload-file';
import {
  Address,
  createBankDetails,
  Author,
  SocialMediaType,
  BankOption,
  User,
  UpdateTicketType,
  Countries,
  States,
  Cities,
  Media,
  AuthorStatus,
  BankDetails,
} from '../../interfaces';
import { AddressService } from '../../services/address-service';
import { BankDetailService } from '../../services/bank-detail-service';
import { AuthorsService } from '../authors/authors-service';
import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { InviteService } from '../../services/invite';
import {
  socialMediaGroup,
  SocialMediaGroupType,
} from '../../interfaces/SocialMedia';
import { SocialMediaService } from '../../services/social-media-service';
import { SocialMedia } from '../social-media/social-media';
import { MatIcon } from '@angular/material/icon';
import { UserService } from '../../services/user';
import { Back } from '../../components/back/back';
import { Country, State, City } from 'country-state-city';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import md5 from 'md5';
import {
  CountryISO,
  NgxMaterialIntlTelInputComponent,
} from 'ngx-material-intl-tel-input';

@Component({
  selector: 'app-add-author',
  imports: [
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncPipe,
    SharedModule,
    MatSelectModule,
    MatCardModule,
    UploadFile,
    SocialMedia,
    MatIcon,
    Back,
    FormsModule,
    ReactiveFormsModule,
    NgxMaterialIntlTelInputComponent,
  ],
  templateUrl: './add-author.html',
  styleUrls: ['./add-author.css'],
})
export class AddAuthor implements OnInit {
  constructor(
    private authorsService: AuthorsService,
    private addressService: AddressService,
    private bankDetailService: BankDetailService,
    private route: ActivatedRoute,
    private inviteService: InviteService,
    private router: Router,
    private socialService: SocialMediaService,
    private userService: UserService,
    private translateService: TranslateService
  ) {
    effect(() => {
      const selected =
        (this.authorSocialMediaGroup.get('socialMedia') as FormArray)?.value
          ?.map((s: any) => s?.type)
          ?.filter((t: string) => !!t) ?? [];
      this.selectedTypes.set(selected);
    });

    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
    this.route.params.subscribe(({ id, signupCode }) => {
      this.authorId = Number(id) || undefined;
      this.signupCode = signupCode;
    });
    this.loggedInUser = this.userService.loggedInUser$;
  }

  countryISO = CountryISO;
  authorId?: number;
  signupCode?: string;
  authorDetails = signal<Author | undefined>(undefined);
  loggedInUser!: Signal<User | null>;
  bankOptions = signal<BankOption[]>([]);
  selectedTypes = signal<string[]>([]);
  selectedBankPrefix = signal<string | null>(null);
  countries!: Countries[];
  states!: States[];
  cities!: Cities[];
  AuthorStatus = AuthorStatus; // Expose AuthorStatus enum to template
  isAllSelected = computed(() => {
    return this.selectedTypes().length >= this.socialMediaArray.length;
  });
  canRaiseTicket = computed(() => {
    if (!this.authorId || !this.authorDetails()) {
      return true; // New author or no author details, can submit normally
    }
    return this.authorDetails()?.status !== AuthorStatus.Pending;
  });
  bankInfo: any = null;
  verifying = false;
  invalidIFSC = false;
  isPrefilling: boolean = false;
  mediaToDeleteId: number | null = null;

  ifscCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const prefix = this.bankOptions().find(
        ({ name }) => name === this.authorBankDetails.controls.name.value
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

  validatePincode(): AsyncValidatorFn {
    return async (control) => {
      const pin = control.value;
      const country = this.authorAddressDetails?.controls?.country?.value;
      const state = this.authorAddressDetails?.controls?.state?.value;
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

  verifyIFSC() {
    const ifsc = this.authorBankDetails
      .get('ifsc')
      ?.value?.trim()
      .toUpperCase();
    if (!ifsc) return;
    this.verifying = true;
    this.invalidIFSC = false;
    // this.http.get(`https://ifsc.razorpay.com/${ifsc}`).subscribe({
    //   next: (res) => {
    //     this.bankInfo = res;
    //     this.verifying = false;
    //   },
    //   error: () => {
    //     this.invalidIFSC = true;
    //     this.verifying = false;
    //     this.bankInfo = null;
    //   },
    // });
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

  async ngOnInit() {
    this.authorFormGroup.controls.signupCode.patchValue(
      this.signupCode || null
    );
    this.authorBankDetails.controls.signupCode.patchValue(
      this.signupCode || null
    );
    this.authorAddressDetails.controls.signupCode.patchValue(
      this.signupCode || null
    );

    this.authorBankDetails.controls.name.valueChanges.subscribe((v) => {
      this.selectedBankPrefix.set(
        this.bankOptions().find(({ name }) => name === v)?.bankCode || null
      );
    });

    this.countries = Country.getAllCountries().map((c) => ({
      name: c.name,
      isoCode: c.isoCode,
    }));
    this.authorAddressDetails
      .get('country')
      ?.valueChanges.subscribe((countryIso) => {
        const isIndia = ['IN', 'INDIA', 'india', 'India', 'in'].includes(
          countryIso || ''
        );

        if (!isIndia) {
          this.authorAddressDetails.controls.pincode.updateValueAndValidity();
        }

        if (countryIso) {
          this.states = State.getStatesOfCountry(countryIso).map((s) => ({
            name: s.name,
            isoCode: s.isoCode,
          }));
          this.authorAddressDetails.patchValue({ state: '', city: '' });
          this.cities = [];
        }
      });
    this.authorAddressDetails
      .get('state')
      ?.valueChanges.subscribe((stateIso) => {
        const countryIso = this.authorAddressDetails.get('country')?.value;
        if (countryIso && stateIso) {
          this.cities = City.getCitiesOfState(countryIso, stateIso).map(
            (c) => ({
              name: c.name,
            })
          );
          this.authorAddressDetails.patchValue({ city: '' });
        }
      });
    this.authorAddressDetails
      .get('pincode')
      ?.valueChanges.pipe(debounceTime(400))
      .subscribe((pin) => {
        const countryIso = this.authorAddressDetails.get('country')?.value;
        if (countryIso === 'IN' && pin?.length === 6) {
          // this.lookupByPincode(pin);
        }
      });

    const defaultCountryIso = 'IN';
    if (!this.authorId && !this.authorAddressDetails.get('country')?.value) {
      this.authorAddressDetails.patchValue({ country: defaultCountryIso });
    }

    this.bankOptions.set(this.bankDetailService.fetchBankOptions());

    if (this.signupCode) {
      const invite = await this.inviteService.findOne(this.signupCode);
      this.authorFormGroup.controls.email.patchValue(invite.email);
      this.authorFormGroup.controls.email.disable();
    }

    if (this.authorId) {
      this.authorFormGroup.controls.userPassword.disable();

      const response = await this.authorsService.getAuthorrById(this.authorId);
      this.authorDetails.set(response);
      this.isPrefilling = true;
      this.prefillForm(response);
      this.isPrefilling = false;
    }
  }
  get mediaControl() {
    return this.authorFormGroup.get('media') as FormControl<Media | null>;
  }

  onMediaAdded(newMedia: Media) {
    const existing = this.mediaControl.value;

    if (existing?.id) this.mediaToDeleteId = existing.id;

    this.mediaControl.setValue({
      ...newMedia,
      id: 0,
      url: '',
    });

    this.mediaControl.updateValueAndValidity(); // 🔥 enable next
    console.log('🆕 New media selected', this.mediaControl.value);
  }
  // lookupByPincode(pin: string) {
  //   if (this.isPrefilling) return;

  //   this.http
  //     .get<any[]>(`https://api.postalpincode.in/pincode/${pin}`)
  //     .subscribe((res) => {
  //       if (res && res[0].Status === 'Success') {
  //         const data = res[0].PostOffice?.[0];
  //         this.authorAddressDetails.patchValue({
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
  //         this.authorAddressDetails.patchValue({
  //           city: '',
  //           state: '',
  //           country: '',
  //         });
  //       }
  //     });
  // }

  private _formBuilder = inject(FormBuilder);
  stepperOrientation: Observable<StepperOrientation>;
  authorFormGroup = this._formBuilder.group({
    id: <number | null>null,
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    username: ['', Validators.required],
    about: ['', Validators.required],
    userPassword: ['', [Validators.required, Validators.minLength(8)]],
    authorImage: [''],
    media: this._formBuilder.control<Media | null>(null, Validators.required),
    signupCode: <string | null>null,
  });
  authorBankDetails = this._formBuilder.group(
    {
      id: <number | null>null,
      name: ['', Validators.required],
      accountHolderName: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)],
      ],
      accountNo: ['', Validators.required],
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
  authorAddressDetails = this._formBuilder.group({
    id: <number | null>null,
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    country: ['', Validators.required],
    pincode: ['', [Validators.required], [this.validatePincode()]],
    signupCode: <string | null>null,
  });
  authorSocialMediaGroup = new FormGroup({
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
    basic: this.authorFormGroup,
    social: this.authorSocialMediaGroup,
  });
  get socialMediaArray(): FormArray<FormGroup<SocialMediaGroupType>> {
    return this.authorSocialMediaGroup.get('socialMedia') as FormArray<
      FormGroup<SocialMediaGroupType>
    >;
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
  prefillForm(authorDetails: Author) {
    this.authorFormGroup.patchValue({
      id: authorDetails.id,
      name:
        authorDetails?.user?.firstName +
        ' ' +
        (authorDetails?.user?.lastName || ''),
      email: authorDetails?.user?.email,
      phoneNumber: authorDetails?.user?.phoneNumber,
      username: authorDetails.username,
      about: authorDetails.about,
    });
    const addr = authorDetails.address[0];

    const countryIso =
      this.countries.find(
        (c) =>
          addr.country?.toLowerCase() === c.name.toLowerCase() ||
          addr.country?.toLowerCase() === c.isoCode.toLowerCase()
      )?.isoCode || '';

    this.authorAddressDetails.patchValue({
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
    this.authorAddressDetails.patchValue({
      state: stateIso,
    });

    this.cities = City.getCitiesOfState(countryIso, stateIso).map((c) => ({
      name: c.name,
    }));

    const cityName =
      this.cities.find((c) => c.name.toLowerCase() === addr.city?.toLowerCase())
        ?.name || '';

    this.authorAddressDetails.patchValue({
      city: cityName,
      pincode: addr.pincode,
    });
    this.selectedBankPrefix.set(
      this.bankOptions().find(
        ({ name }) => name === authorDetails.bankDetails?.[0]?.name
      )?.bankCode || null
    );
    this.authorBankDetails.patchValue({
      id: authorDetails.bankDetails?.[0]?.id,
      name: authorDetails.bankDetails?.[0]?.name,
      accountNo: authorDetails.bankDetails?.[0]?.accountNo,
      confirmAccountNo: authorDetails.bankDetails?.[0]?.accountNo,
      ifsc: authorDetails.bankDetails?.[0]?.ifsc,
      panCardNo: authorDetails.bankDetails?.[0]?.panCardNo,
      accountType: authorDetails.bankDetails?.[0]?.accountType,
      accountHolderName: authorDetails.bankDetails?.[0]?.accountHolderName,
      gstNumber: authorDetails.bankDetails?.[0]?.gstNumber,
    });
    const socialMediaArray = this.authorSocialMediaGroup.get(
      'socialMedia'
    ) as FormArray<FormGroup<SocialMediaGroupType>>;

    socialMediaArray.clear();
    if (!authorDetails.socialMedias?.length) {
      socialMediaArray.push(this.createSocialGroup());
    }
    authorDetails.socialMedias?.forEach((media) => {
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
    const mediaList = authorDetails.medias as Media[];
    if (mediaList?.length > 0) {
      this.mediaControl.setValue(mediaList[0]);
    } else {
      this.mediaControl.setValue(null);
    }
  }
  async handleNewOrSuperAdminAuthorSubmission(authorData: Author) {
    const response = (await this.authorsService.createAuthor(
      authorData as Author
    )) as Author;
    this.authorId = response.id;
    if (response && response.id) {
      const authorAddressData = {
        ...this.authorAddressDetails.value,
        autherId: response.id,
      };
      await this.addressService.createOrUpdateAddress(
        authorAddressData as Address
      );
      const authorBankData = {
        ...this.authorBankDetails.value,
        autherId: response.id,
      };
      await this.bankDetailService.createOrUpdateBankDetail(
        authorBankData as createBankDetails
      );

      const socialMediaData = this.socialMediaArray.controls
        .map((group) => ({
          ...group.value,
          autherId: response.id,
        }))
        .filter((item) => item.type && item.url?.trim());

      if (socialMediaData.length > 0) {
        await this.socialService.createOrUpdateSocialMediaLinks(
          socialMediaData as socialMediaGroup[]
        );
      }
      const media = this.mediaControl.value;
      if (this.mediaToDeleteId && media?.file) {
        await this.authorsService.removeImage(this.mediaToDeleteId);
        console.log('🗑 Old image deleted');

        await this.authorsService.updateMyImage(media.file, response.id);
        console.log('⬆ New image uploaded');
      } else if (!this.mediaToDeleteId && media?.file) {
        await this.authorsService.updateMyImage(media.file, response.id);
        console.log('📤 New image uploaded (no old media existed)');
      }
    }

    let html = 'You have successfully created author';
    if (this.authorId) html = 'You have successfully updated author';
    if (this.signupCode)
      html =
        'You have successfully registered as author. Please login to continue';

    await Swal.fire({
      title: 'Success',
      icon: 'success',
      html,
      heightAuto: false,
    });
  }
  /**
   * Compare two values, handling string trimming and null/undefined
   */
  private compareValues(newValue: any, existingValue: any): boolean {
    if (newValue === undefined || newValue === null || newValue === '') {
      return false; // No new value provided, no change
    }
    const newStr = String(newValue).trim();
    const existingStr = existingValue ? String(existingValue).trim() : '';
    return newStr !== existingStr;
  }

  /**
   * Check if address has changes
   */
  private hasAddressChanges(existingAddress: Address | undefined): boolean {
    if (!existingAddress) return false;

    const formValue = this.authorAddressDetails.value;
    return (
      this.compareValues(formValue.address, existingAddress.address) ||
      this.compareValues(formValue.city, existingAddress.city) ||
      this.compareValues(formValue.state, existingAddress.state) ||
      this.compareValues(formValue.country, existingAddress.country) ||
      this.compareValues(formValue.pincode, existingAddress.pincode)
    );
  }

  /**
   * Check if bank details have changes
   */
  private hasBankChanges(existingBank: BankDetails | undefined): boolean {
    if (!existingBank) return false;

    const formValue = this.authorBankDetails.value as any; // Use any to access gstNumber if it exists
    return (
      this.compareValues(formValue.name, existingBank.name) ||
      this.compareValues(
        formValue.accountHolderName,
        existingBank.accountHolderName
      ) ||
      this.compareValues(formValue.accountNo, existingBank.accountNo) ||
      this.compareValues(formValue.ifsc, existingBank.ifsc) ||
      this.compareValues(formValue.panCardNo, existingBank.panCardNo) ||
      this.compareValues(formValue.accountType, existingBank.accountType) ||
      // gstNumber might not be in form, so only compare if it exists in form value
      (formValue.gstNumber !== undefined &&
        formValue.gstNumber !== null &&
        this.compareValues(formValue.gstNumber, existingBank.gstNumber))
    );
  }

  /**
   * Check if author details have changes
   */
  private hasAuthorChanges(existingAuthor: Author | undefined): boolean {
    if (!existingAuthor) return false;

    const formValue = this.authorFormGroup.value;
    const authorName = formValue.name || '';
    const nameParts = authorName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return (
      this.compareValues(firstName, existingAuthor.user?.firstName) ||
      this.compareValues(lastName, existingAuthor.user?.lastName) ||
      this.compareValues(formValue.email, existingAuthor.user?.email) ||
      this.compareValues(
        formValue.phoneNumber,
        existingAuthor.user?.phoneNumber
      ) ||
      this.compareValues(formValue.about, existingAuthor.about) ||
      this.compareValues(formValue.username, existingAuthor.username)
    );
  }

  /**
   * Check if media has changes
   */
  private hasMediaChanges(existingMedia: Media | undefined): boolean {
    const newMedia = this.mediaControl.value;
    if (!newMedia?.file) {
      return false; // No new file, no change
    }
    if (!existingMedia) {
      return true; // New file and no existing media = change
    }
    // Compare file name and size
    return (
      newMedia.file.name !== existingMedia.name ||
      newMedia.file.size !== (existingMedia as any).size
    );
  }

  /**
   * Check if social media has changes
   */
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

  /**
   * Get existing value for a field based on field name
   */
  private getExistingValueForField(
    field: string,
    existingAuthor?: Author,
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
      // Author fields
      authorName: () =>
        existingAuthor
          ? `${existingAuthor.user?.firstName || ''} ${
              existingAuthor.user?.lastName || ''
            }`.trim()
          : '',
      authorEmail: () => existingAuthor?.user?.email,
      authorContactNumber: () => existingAuthor?.user?.phoneNumber,
      authorAbout: () => existingAuthor?.about,
      authorUsername: () => existingAuthor?.username,
    };

    const getter = fieldMap[field];
    return getter ? getter() : undefined;
  }

  async handleAuthorUpdateFlow(
    authorData: Author
  ): Promise<{ ticketsRaised: boolean; shouldNavigateBack: boolean }> {
    // Publishers can only raise ADDRESS and BANK tickets
    // AUTHOR type tickets are only for authors updating their own info
    const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';

    // Fetch existing author data if not already loaded
    let existingAuthor = this.authorDetails();
    if (!existingAuthor && this.authorId) {
      try {
        existingAuthor = await this.authorsService.getAuthorrById(
          this.authorId
        );
        this.authorDetails.set(existingAuthor);
      } catch (error) {
        console.error('Error fetching author details:', error);
        // Fall back to current behavior if fetch fails
        existingAuthor = undefined;
      }
    }

    const existingAddress = existingAuthor?.address?.[0];
    const existingBank = existingAuthor?.bankDetails?.[0];
    const existingMedia = existingAuthor?.medias?.[0];
    const existingSocialMedia = existingAuthor?.socialMedias || [];

    // Check for changes in each section
    const hasAddressChange = this.hasAddressChanges(existingAddress);
    const hasBankChange = this.hasBankChanges(existingBank);
    // Publishers can also raise AUTHOR tickets when updating active authors
    const hasAuthorChange = this.hasAuthorChanges(existingAuthor);
    const hasMediaChange = this.hasMediaChanges(existingMedia);
    const hasSocialMediaChange =
      this.hasSocialMediaChanges(existingSocialMedia);

    // Debug logging
    console.log('Change detection results:', {
      isPublisher,
      hasAddressChange,
      hasBankChange,
      hasAuthorChange,
      hasMediaChange,
      hasSocialMediaChange,
      formName: this.authorFormGroup.value.name,
      existingName: existingAuthor
        ? `${existingAuthor.user?.firstName || ''} ${
            existingAuthor.user?.lastName || ''
          }`.trim()
        : 'N/A',
      authorStatus: existingAuthor?.status,
    });

    const sections = [
      {
        type: UpdateTicketType.ADDRESS,
        fields: ['address', 'city', 'state', 'country', 'pincode'],
        hasChange: hasAddressChange,
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
        hasChange: hasBankChange,
      },
      // Include AUTHOR type ticket for all users when author details change
      // Publishers can raise AUTHOR tickets for active authors they manage
      {
        type: UpdateTicketType.AUTHOR,
        fields: [
          'authorName',
          'authorEmail',
          'authorContactNumber',
          'authorAbout',
          'authorUsername',
        ],
        hasChange: hasAuthorChange,
      },
    ];

    // Build rawValue from current form values (not from authorData which might be stale)
    const rawValue = {
      ...this.authorAddressDetails.value,
      ...this.authorBankDetails.value,
      authorName: this.authorFormGroup.value.name,
      authorEmail: this.authorFormGroup.value.email,
      authorContactNumber: this.authorFormGroup.value.phoneNumber,
      authorAbout: this.authorFormGroup.value.about,
      authorUsername: this.authorFormGroup.value.username,

      bankName: this.authorBankDetails.value.name,
      accountHolderName: this.authorBankDetails.value.accountHolderName,
    };

    let ticketsRaised = false;

    // Only create tickets for sections with actual changes
    for (const section of sections) {
      console.log(
        `Processing section: ${section.type}, hasChange: ${section.hasChange}`
      );

      if (!section.hasChange) {
        console.log(`Skipping section ${section.type} - no changes detected`);
        continue; // Skip if no changes detected
      }

      const payload: any = { type: section.type };
      let hasValues = false;

      section.fields.forEach((field: string) => {
        const value = rawValue[field as keyof typeof rawValue];
        if (value !== undefined && value !== null && value !== '') {
          // Only include field if it's different from existing value
          const existingValue = this.getExistingValueForField(
            field,
            existingAuthor,
            existingAddress,
            existingBank
          );

          // For authorName, compare by splitting into first/last name parts
          if (field === 'authorName') {
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

            console.log(`Comparing authorName:`, {
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
        console.log(`Creating ticket for ${section.type}:`, payload);

        // Add target IDs when publisher is editing an author
        // This ensures the backend knows which entity's address/bank/details to update
        if (this.authorId) {
          if (section.type === UpdateTicketType.ADDRESS) {
            payload.targetAuthorId = this.authorId;
          }
          if (section.type === UpdateTicketType.BANK) {
            payload.targetAuthorId = this.authorId;
          }
          if (section.type === UpdateTicketType.AUTHOR) {
            payload.authorId = this.authorId;
          }
        }

        await this.userService.raisingTicket(payload);
        ticketsRaised = true;
        console.log(`Ticket created successfully for ${section.type}`);
      } else {
        console.log(`No values to include for ${section.type} ticket`);
      }
    }

    // Update author directly if status is Pending (can be updated without tickets)
    // For Active authors, tickets will handle the update when approved
    if (this.authorId && existingAuthor?.status === AuthorStatus.Pending) {
      try {
        // Update author basic info
        const authorUpdateData = {
          id: this.authorId,
          name: this.authorFormGroup.value.name,
          email: this.authorFormGroup.value.email,
          phoneNumber: this.authorFormGroup.value.phoneNumber,
          about: this.authorFormGroup.value.about,
          username: this.authorFormGroup.value.username,
        } as Author;

        await this.authorsService.createAuthor(authorUpdateData);

        // Update address if changed
        if (hasAddressChange && existingAddress) {
          await this.addressService.createOrUpdateAddress({
            ...this.authorAddressDetails.value,
            id: existingAddress.id,
            autherId: this.authorId,
          } as Address);
        }

        // Update bank details if changed
        if (hasBankChange && existingBank) {
          await this.bankDetailService.createOrUpdateBankDetail({
            ...this.authorBankDetails.value,
            id: existingBank.id,
            autherId: this.authorId,
          } as createBankDetails);
        }
      } catch (error) {
        console.error('Error updating author directly:', error);
      }
    }

    // Only update social media if there are changes
    if (hasSocialMediaChange) {
      const socialMediaData = this.socialMediaArray.controls
        .map((group) => ({
          ...group.value,
          autherId: this.authorId,
        }))
        .filter((item) => item.type && item.url?.trim());

      if (socialMediaData.length > 0) {
        await this.socialService.createOrUpdateSocialMediaLinks(
          socialMediaData as socialMediaGroup[]
        );
      }
    }

    // Only update media if there are changes
    if (hasMediaChange) {
      const media = this.mediaControl.value;
      if (this.mediaToDeleteId && media?.file) {
        await this.authorsService.removeImage(this.mediaToDeleteId);
        console.log('🗑 Old image deleted');

        await this.authorsService.updateMyImage(
          media.file,
          this.authorId as number
        );
        console.log('⬆ New image uploaded');
      } else if (!this.mediaToDeleteId && media?.file) {
        await this.authorsService.updateMyImage(
          media.file,
          this.authorId as number
        );
        console.log('📤 New image uploaded (no old media existed)');
      }
    }

    console.log('🎫 Tickets raised:', ticketsRaised);

    if (ticketsRaised) {
      await Swal.fire({
        icon: 'success',
        text: 'Update ticket raised successfully',
        title: 'Success',
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

      // Social media is optional, so we don't check its validity
      const invalid =
        this.authorFormGroup.invalid ||
        this.authorAddressDetails.invalid ||
        this.authorBankDetails.invalid;

      if (invalid) {
        this.authorFormGroup.markAllAsTouched();
        this.authorAddressDetails.markAllAsTouched();
        this.authorBankDetails.markAllAsTouched();
        // Don't mark social media as touched since fields are optional

        await Swal.fire({
          title: 'Error',
          text: 'Please fill all required fields correctly.',
          icon: 'error',
          heightAuto: false,
        });
        return;
      }

      if (this.authorBankDetails.hasError('accountMismatch')) {
        await Swal.fire({
          title: 'Error',
          text: 'Account numbers do not match.',
          icon: 'error',
          heightAuto: false,
        });
        return;
      }

      const authorData = {
        ...this.authorFormGroup.value,
        id: this.authorId || this.authorFormGroup.value.id,
        email: this.authorFormGroup.controls.email.value,
        userPassword: this.authorFormGroup.controls.userPassword.value
          ? md5(this.authorFormGroup.controls.userPassword.value)
          : undefined,
        phoneNumber:
          this.authorFormGroup.controls.phoneNumber.value?.replaceAll(' ', ''),
      } as Author;

      let updateFlowResult = {
        ticketsRaised: false,
        shouldNavigateBack: false,
      };

      // Check if author is editing their own profile
      const isEditingSelf = this.authorId === this.loggedInUser()?.auther?.id;

      if (this.loggedInUser()?.accessLevel === 'SUPERADMIN' || !this.authorId) {
        // Superadmin or creating new author → direct save
        await this.handleNewOrSuperAdminAuthorSubmission(authorData);
      } else {
        // If author status is Pending, allow direct update (like titles)
        // Otherwise, raise update ticket
        if (this.authorDetails()?.status === AuthorStatus.Pending) {
          await this.handleNewOrSuperAdminAuthorSubmission(authorData);
        } else {
          updateFlowResult = await this.handleAuthorUpdateFlow(authorData);
        }
      }

      // Redirect based on whether tickets were raised
      console.log('🔀 Author redirect logic:', {
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
        const isAuthor = this.loggedInUser()?.accessLevel === 'AUTHER';

        if (isEditingSelf) {
          // Author/Publisher edited their own profile → return to profile
          console.log('➡️ Redirecting to profile (self-edit)');
          this.router.navigate(['/profile']);
        } else {
          // Publisher editing an author → go to tickets
          const tab = isAuthor ? 'author' : 'publisher';
          console.log('➡️ Redirecting to update-tickets with tab:', tab);
          this.router.navigate(['/update-tickets'], {
            queryParams: { tab },
          });
        }
        return;
      }

      // Direct save (superadmin or new author or pending) → redirect to list
      console.log('➡️ Redirecting to author list (direct save)');
      this.router.navigate(['/author']);
    } catch (error: any) {
      console.error('❌ Error in onSubmit:', error);
    }
  }
}
