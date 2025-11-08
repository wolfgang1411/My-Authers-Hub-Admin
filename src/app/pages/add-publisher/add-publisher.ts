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
import {
  Address,
  BankOption,
  createBankDetails,
  Publishers,
  SocialMediaType,
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
import { startsWithValidator } from '../../common/utils/custom-validators';
import { TranslateService } from '@ngx-translate/core';
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

    this.publisherBankDetails.controls.name.valueChanges.subscribe((v) => {
      this.selectedBankPrefix.set(
        this.bankOptions().find(({ BANK }) => BANK === v)?.BANKCODE || null
      );
    });

    const { data: bankOptions } =
      await this.bankDetailService.fetchBankOptions();
    this.bankOptions.set(bankOptions);

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
      this.prefillForm(response);
    }
  }
  private _formBuilder = inject(FormBuilder);
  stepperOrientation: Observable<StepperOrientation>;

  ifscCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const prefix = this.bankOptions().find(
        ({ BANK }) => BANK === this.publisherBankDetails.controls.name.value
      )?.BANKCODE;
      if (!prefix) return null;
      const value = control.value?.toUpperCase?.().trim?.() || '';
      if (!value) return null; // skip if empty, let 'required' handle that
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

  publisherFormGroup = this._formBuilder.group({
    id: <number | null>null,
    pocName: ['', Validators.required],
    pocEmail: ['', [Validators.required, Validators.email]],
    pocPhoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    name: ['', Validators.required],
    designation: ['', Validators.required],
    logo: [''],
    userPassword: ['', [Validators.required, Validators.minLength(8)]],
    signupCode: <string | null>null,
  });

  selectedBankPrefix = signal<string | null>(null);

  publisherBankDetails = this._formBuilder.group({
    id: <number | null>null,
    accountHolderName: [
      '',
      [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)],
    ],
    name: ['', [Validators.required]],
    accountNo: ['', [Validators.required]],
    ifsc: ['', [Validators.required, this.ifscCodeValidator()]],
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
  get socialMediaArray(): FormArray<FormGroup<SocialMediaGroupType>> {
    return this.publisherSocialMediaGroup.get('socialMedia') as FormArray<
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
    this.selectedBankPrefix.set(
      this.bankOptions().find(
        ({ BANK }) => BANK === publisherDetails.bankDetails?.[0]?.name
      )?.BANKCODE || null
    );
    this.publisherBankDetails.patchValue({
      id: publisherDetails.bankDetails?.[0]?.id,
      accountHolderName: publisherDetails.bankDetails?.[0]?.accountHolderName,
      name: publisherDetails.bankDetails?.[0]?.name,
      accountNo: publisherDetails.bankDetails?.[0]?.accountNo,
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
  }
  get isAllSocialMediaSelected(): boolean {
    const allOptions = this.socialMediaArray ?? [];
    const formValue = this.publisherSocialMediaGroup?.value ?? {};
    const selectedTypes: string[] = (formValue.socialMedia ?? [])
      .map((s: any) => s?.type)
      .filter((t: string) => !!t);

    return selectedTypes.length >= allOptions.length;
  }

  async onSubmit() {
    const publisherData = {
      ...this.publisherFormGroup.value,
      pocEmail: this.publisherFormGroup.controls.pocEmail.value,
    } as any;

    try {
      if (
        this.loggedInUser()?.accessLevel === 'SUPERADMIN' ||
        !this.publisherId
      ) {
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

          console.log({ publisherBankData });

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
      } else {
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
              payload[field as keyof typeof payload] = value;
              hasValues = true;
            } else {
              payload[field as keyof typeof payload] = null;
            }
            console.log(payload, 'raising a ticket');
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
            console.log(socialMediaData, 'social media');
          }
          Swal.fire({
            icon: 'success',
            text: 'Update ticket raised successfully',
            title: 'Success',
            heightAuto: false,
          });
        }
      }
      if (this.signupCode) {
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/publisher']);
      }
    } catch (error: any) {
      console.log(error);
    }
  }
  jumptonext() {
    console.log(
      this.publisherAddressDetails.value,
      'adrdressss',
      this.publisherFormGroup.value,
      'publiserrr form'
    );
  }
}
