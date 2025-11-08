import { Component, computed, inject, Signal, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  FormControl,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
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
import {
  Address,
  createBankDetails,
  Author,
  SocialMediaType,
  BankOption,
  User,
} from '../../interfaces';
import { AddressService } from '../../services/address-service';
import { BankDetailService } from '../../services/bank-detail-service';
import { AuthorsService } from '../authors/authors-service';
import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { Authors } from '../authors/authors';
import { InviteService } from '../../services/invite';
import {
  socialMediaGroup,
  SocialMediaGroupType,
} from '../../interfaces/SocialMedia';
import { SocialMediaService } from '../../services/social-media-service';
import { SocialMedia } from '../social-media/social-media';
import { TranslateService } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-add-author',
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
    MatIcon,
  ],
  templateUrl: './add-author.html',
  styleUrl: './add-author.css',
})
export class AddAuthor {
  constructor(
    private authorsService: AuthorsService,
    private addressService: AddressService,
    private bankDetailService: BankDetailService,
    private route: ActivatedRoute,
    private inviteService: InviteService,
    private router: Router,
    private socialService: SocialMediaService,
    private translateService: TranslateService,
    private userService: UserService
  ) {
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
  authorId?: number;
  signupCode?: string;
  authorDetails?: Author;
  loggedInUser!: Signal<User | null>;
  bankOptions = signal<BankOption[]>([]);
  selectedTypes = signal<string[]>([]);

  isAllSelected = computed(() => {
    return this.selectedTypes().length >= this.socialMediaArray.length;
  });

  ifscCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const prefix = this.bankOptions().find(
        ({ BANK }) => BANK === this.authorBankDetails.controls.name.value
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

    const { data } = await this.bankDetailService.fetchBankOptions();
    this.bankOptions.set(data);

    if (this.signupCode) {
      const invite = await this.inviteService.findOne(this.signupCode);
      this.authorFormGroup.controls.email.patchValue(invite.email);
      this.authorFormGroup.controls.email.disable();
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

    if (this.authorId) {
      const response = await this.authorsService.getAuthorrById(this.authorId);
      this.authorDetails = response;
      this.prefillForm(response);
    }
  }

  private _formBuilder = inject(FormBuilder);
  stepperOrientation: Observable<StepperOrientation>;
  authorFormGroup = this._formBuilder.group({
    id: <number | null>null,
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    username: ['', Validators.required],
    about: ['', Validators.required],
    authorImage: [''],
    signupCode: <string | null>null,
  });
  authorBankDetails = this._formBuilder.group({
    id: <number | null>null,
    name: ['', Validators.required],
    accountHolderName: ['', Validators.required],
    accountNo: ['', Validators.required],
    ifsc: ['', [Validators.required, this.ifscCodeValidator()]],
    panCardNo: ['', Validators.required],
    accountType: ['', Validators.required],
    signupCode: <string | null>null,
  });

  authorAddressDetails = this._formBuilder.group({
    id: <number | null>null,
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    country: ['', Validators.required],
    pincode: ['', Validators.required],
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
    this.authorAddressDetails.patchValue({
      id: authorDetails.address[0]?.id,
      address: authorDetails.address[0]?.address,
      city: authorDetails.address[0]?.city,
      state: authorDetails.address[0]?.state,
      country: authorDetails.address[0]?.country,
      pincode: authorDetails.address[0]?.pincode,
    });
    this.authorBankDetails.patchValue({
      id: authorDetails.bankDetails?.[0]?.id,
      name: authorDetails.bankDetails?.[0]?.name,
      accountNo: authorDetails.bankDetails?.[0]?.accountNo,
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
  }

  async onSubmit() {
    const authorData = {
      ...this.authorFormGroup.value,
      email: this.authorFormGroup.controls.email.value,
    };
    try {
      const response = (await this.authorsService.createAuthor(
        authorData as Author
      )) as Author;
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
          console.log(socialMediaData, 'social media');
        }
      }

      let html = 'You have successfully created author';
      if (this.authorId) {
        html = 'You have successfully updated author';
      }

      if (this.signupCode) {
        html =
          'You have successfully registerd as author please login to continue';
      }

      await Swal.fire({
        html,
        title: 'success',
        icon: 'success',
        heightAuto: false,
      });
      if (this.signupCode) {
        this.router.navigate(['/login']);
      }
    } catch (error: any) {
      Swal.fire({
        title: 'error',
        text: error.message,
        icon: error,
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
