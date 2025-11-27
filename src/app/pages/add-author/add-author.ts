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
  private http = inject(HttpClient);
  authorId?: number;
  signupCode?: string;
  authorDetails?: Author;
  loggedInUser!: Signal<User | null>;
  bankOptions = signal<BankOption[]>([]);
  selectedTypes = signal<string[]>([]);
  selectedBankPrefix = signal<string | null>(null);
  countries!: Countries[];
  states!: States[];
  cities!: Cities[];
  isAllSelected = computed(() => {
    return this.selectedTypes().length >= this.socialMediaArray.length;
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
      const country = this.authorAddressDetails.controls.country.value;
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

    this.bankOptions.set(this.bankDetailService.fetchBankOptions());

    if (this.signupCode) {
      const invite = await this.inviteService.findOne(this.signupCode);
      this.authorFormGroup.controls.email.patchValue(invite.email);
      this.authorFormGroup.controls.email.disable();
    }

    if (this.authorId) {
      const response = await this.authorsService.getAuthorrById(this.authorId);
      this.authorDetails = response;
      this.isPrefilling = true;
      this.prefillForm(response);
      this.isPrefilling = false;
    }
  }
  get mediasArray() {
    return this.authorFormGroup.get('medias') as FormArray;
  }

  onMediaAdded(newMedia: Media) {
    const existing = this.mediasArray.value[0];

    if (existing?.id) this.mediaToDeleteId = existing.id;

    this.mediasArray.setControl(
      0,
      this._formBuilder.control({
        ...newMedia,
        id: 0,
        url: '',
      })
    );

    this.authorFormGroup.get('medias')?.updateValueAndValidity(); // 🔥 enable next
    console.log('🆕 New media selected', this.mediasArray.value[0]);
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
    password: [''],
    authorImage: [''],
    medias: this._formBuilder.array<Media>([], Validators.required),
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
    this.mediasArray.clear();
    if (mediaList?.length > 0) {
      this.mediasArray.push(this._formBuilder.control(mediaList[0]));
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
        .filter((item) => item.url?.trim());

      if (socialMediaData.length > 0) {
        await this.socialService.createOrUpdateSocialMediaLinks(
          socialMediaData as socialMediaGroup[]
        );
      }
      const media = this.mediasArray.value[0];
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
  async handleAuthorUpdateFlow(authorData: Author) {
    const sections = [
      {
        type: UpdateTicketType.ADDRESS,
        fields: ['address', 'city', 'state', 'country', 'pincode'],
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
      },
      {
        type: UpdateTicketType.AUTHOR,
        fields: [
          'authorName',
          'authorEmail',
          'authorContactNumber',
          'authorAbout',
          'authorUsername',
        ],
      },
    ];

    const rawValue = {
      ...this.authorAddressDetails.value,
      ...this.authorBankDetails.value,
      ...authorData,
      authorName: this.authorFormGroup.value.name,
      authorEmail: this.authorFormGroup.value.email,
      authorContactNumber: this.authorFormGroup.value.phoneNumber,
      authorAbout: this.authorFormGroup.value.about,
      authorUsername: this.authorFormGroup.value.username,

      bankName: this.authorBankDetails.value.name,
      accountHolderName: this.authorBankDetails.value.accountHolderName,
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
          autherId: this.authorId,
        }))
        .filter((item) => item.url?.trim());

      if (socialMediaData.length > 0) {
        await this.socialService.createOrUpdateSocialMediaLinks(
          socialMediaData as socialMediaGroup[]
        );
      }
      const media = this.mediasArray.value[0];
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

      await Swal.fire({
        icon: 'success',
        text: 'Update ticket raised successfully',
        title: 'Success',
        heightAuto: false,
      });
    }
  }

  async onSubmit() {
    try {
      const invalid =
        this.authorFormGroup.invalid ||
        this.authorSocialMediaGroup.invalid ||
        this.authorAddressDetails.invalid ||
        this.authorBankDetails.invalid;

      if (invalid) {
        this.authorFormGroup.markAllAsTouched();
        this.authorAddressDetails.markAllAsTouched();
        this.authorBankDetails.markAllAsTouched();
        this.authorSocialMediaGroup.markAllAsTouched();

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
        email: this.authorFormGroup.controls.email.value,
      } as Author;

      if (this.loggedInUser()?.accessLevel === 'SUPERADMIN' || !this.authorId) {
        await this.handleNewOrSuperAdminAuthorSubmission(authorData);
      } else {
        await this.handleAuthorUpdateFlow(authorData);
      }
      if (this.signupCode) {
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/author']);
      }
    } catch (error: any) {}
  }
}
