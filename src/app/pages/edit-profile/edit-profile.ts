import { Component, effect, Renderer2, Signal, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  BankDetailsType,
  Address,
  BankDetails,
  CreateUser,
  Media,
  UpdateTicketType,
  UpdateUser,
  UpdateUserWithTicket,
  User,
  Publishers,
  Author,
} from '../../interfaces';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SharedModule } from '../../modules/shared/shared-module';
import { RouterModule } from '@angular/router';
import { UserService } from '../../services/user';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';

@Component({
  selector: 'app-edit-profile',
  imports: [
    MatFormFieldModule,
    MatButton,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule,
    MatSlideToggleModule,
    SharedModule,
    RouterModule,
    SafeUrlPipe,
  ],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.css',
})
export class EditProfile {
  constructor(
    public userService: UserService,
    private authService: AuthService,
    private renderrer: Renderer2,
    private publisherService: PublisherService,
    private autherService: AuthorsService
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
    effect(() => {
      console.log(this.loggedInUser(), 'logged inuser');
      const user = this.loggedInUser() || ({} as User);
      const publisher = this.publisher();
      const author = this.author();
      if (user) {
        this.settingData({
          ...user,
          publisher: publisher || undefined,
          auther: author || undefined,
        });
      }
    });
  }

  publisher = signal<Publishers | null>(null);
  author = signal<Author | null>(null);
  loggedInUser!: Signal<User | null>;
  isEditing = signal(true);
  showTicketForm = signal(false);
  loading = signal(false);
  userId!: number;
  userDetails = signal<UpdateUser | null>(null);
  userAddress = signal<Address | null>(null);
  userBankDetails = signal<BankDetails | null>(null);
  completeAddress = signal<string>('');
  notifications = {
    email: signal(true),
    sms: signal(false),
    push: signal(true),
  };

  privacy = {
    showProfilePublic: signal(true),
    twoFactorAuth: signal(false),
  };

  personalForm = new FormGroup({
    firstName: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [Validators.required],
    }),
    lastName: new FormControl<string | null>(null, { nonNullable: false }),
    email: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [Validators.required, Validators.email],
    }),
    url: new FormControl<string | null>(null),
    phoneNumber: new FormControl<string | null>(null, { nonNullable: false }),
  });

  ticketForm = new FormGroup({
    address: new FormControl<string | null>(null),
    city: new FormControl<string | null>(null),
    state: new FormControl<string | null>(null),
    country: new FormControl<string | null>(null),
    pincode: new FormControl<string | null>(null),
    bankName: new FormControl<string | null>(null),
    accountHolderName: new FormControl<string | null>(null),
    accountNo: new FormControl<string | null>(null),
    ifsc: new FormControl<string | null>(null),
    panCardNo: new FormControl<string | null>(null),
    accountType: new FormControl<BankDetailsType | null>(null),
    gstNumber: new FormControl<string | null>(null, [
      this.gstFormatValidator(),
    ]),
    publisherName: new FormControl<string | null>(null),
    publisherEmail: new FormControl<string | null>(null),
    authorName: new FormControl<string | null>(null),
    authorEmail: new FormControl<string | null>(null),
    authorContactNumber: new FormControl<string | null>(null),
    authorAbout: new FormControl<string | null>(null),
    authorUsername: new FormControl<string | null>(null),
    type: new FormControl<UpdateTicketType | null>(null),
  });

  passwordForm = new FormGroup({
    oldPassword: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [Validators.required],
    }),
    newPassword: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [Validators.required],
    }),
  });
  prefillPersonalForm(userData: UpdateUser) {
    this.personalForm.patchValue({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
    });
  }
  prefillTicketForm(userData: UpdateUserWithTicket) {
    this.ticketForm.patchValue({
      address: userData.address,
      city: userData.city,
      state: userData.state,
      country: userData.country,
      pincode: userData.pincode,
      bankName: userData.bankName,
      accountNo: userData.accountNo,
      accountHolderName: userData.accountHolderName,
      ifsc: userData.ifsc,
      panCardNo: userData.panCardNo,
      accountType: userData.accountType,
      gstNumber: userData.gstNumber,
      publisherName: userData.publisherName,
      publisherEmail: userData.publisherEmail,
      authorName: userData.authorName,
      authorEmail: userData.authorEmail,
      authorContactNumber: userData.authorContactNumber,
      authorAbout: userData.authorAbout,
      authorUsername: userData.authorUsername,
    });
  }

  async ngOnInit() {
    await this.fetchAndSetPublisher();
    await this.fetchAndSetAuthor();
  }
  async fetchAndSetPublisher() {
    const user = this.loggedInUser();
    if (!user?.publisher?.id) return;
    const response = await this.publisherService.getPublisherById(
      user.publisher?.id as number
    );
    this.publisher.set(response);
  }

  async fetchAndSetAuthor() {
    const user = this.loggedInUser();
    if (!user?.auther?.id) return;
    const response = await this.autherService.getAuthorrById(
      user.auther?.id as number
    );
    this.author.set(response);
  }

  async settingData(userData?: User | null) {
    if (!userData) return;
    this.userBankDetails.set(
      userData?.publisher?.bankDetails?.[0] ??
        userData?.auther?.bankDetails?.[0] ??
        null
    );
    this.userAddress.set(
      userData?.publisher?.address[0] ||
        userData?.auther?.address[0] ||
        userData?.address?.[0] ||
        null
    );
    this.completeAddress.set(
      `${this.userAddress()?.address ?? ''} ${this.userAddress()?.city ?? ''} ${
        this.userAddress()?.state ?? ''
      } ${this.userAddress()?.country ?? ''} - ${
        this.userAddress()?.pincode ?? ''
      }`
    );

    const Finaladdress = this.userAddress();
    const FinalBankDetails = this.userBankDetails();
    const UpdateUserWithTicket: UpdateUserWithTicket = {
      address: Finaladdress?.address,
      city: Finaladdress?.city,
      state: Finaladdress?.state,
      country: Finaladdress?.country,
      pincode: Finaladdress?.pincode,
      bankName: FinalBankDetails?.name,
      accountHolderName: FinalBankDetails?.accountHolderName,
      accountNo: FinalBankDetails?.accountNo,
      ifsc: FinalBankDetails?.ifsc,
      panCardNo: FinalBankDetails?.panCardNo,
      accountType: FinalBankDetails?.accountType,
      gstNumber: FinalBankDetails?.gstNumber,
      publisherName: userData?.publisher
        ? userData?.publisher?.name
        : undefined,
      publisherEmail: userData?.publisher
        ? userData?.publisher?.email
        : undefined,
      authorAbout: userData?.auther ? userData?.auther?.about : undefined,
      authorUsername: userData?.auther ? userData?.auther?.username : undefined,
    };
    this.prefillTicketForm(UpdateUserWithTicket as UpdateUserWithTicket);

    this.prefillPersonalForm(userData as UpdateUser);
  }
  gstFormatValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value || value.trim() === '') {
        return null;
      }

      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

      if (!gstRegex.test(value)) {
        return {
          gstNumber:
            'Invalid GST Number. Format: 15 characters (e.g., 22ABCDE1234F1Z5)',
        };
      }
      return null;
    };
  }

  async updateUserProfile() {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }
    const payload: CreateUser = this.personalForm.getRawValue();
    if (this.loggedInUser() && this.loggedInUser()?.id) {
      (payload as UpdateUser).id = this.loggedInUser()?.id;
    }
    console.log(this.loggedInUser(), 'userrrdetaill');
    const response = await this.userService.createOrUpdateUser(payload);
    if (response) {
      this.userService.setLoggedInUser(response);
      this.userDetails.set(response);
      this.prefillPersonalForm(response);
      Swal.fire({
        icon: 'success',
        text: 'Profile updated successfully',
        title: 'Success',
        heightAuto: false,
      });
    }
    this.isEditing.set(false);
  }

  async raiseUserTicket() {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }
    const rawValue = this.ticketForm.value;
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
        type: UpdateTicketType.PUBLISHER,
        fields: ['publisherName', 'publisherEmail'],
      },
      {
        type: UpdateTicketType.AUTHOR,
        fields: ['authorAbout', 'authorUsername'],
      },
    ];
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
      });

      if (hasValues) {
        await this.userService.raisingTicket(payload);
      }
    }

    Swal.fire({
      icon: 'success',
      text: 'Support ticket raised successfully',
      title: 'Success',
      heightAuto: false,
    });
    this.ticketForm.reset();
    this.showTicketForm.set(false);
  }

  async changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        text: 'New password and confirm password do not match.',
        title: 'Error',
        heightAuto: false,
      });
      return;
    }
    const payload = {
      oldPassword: this.passwordForm.value.oldPassword,
      newPassword,
    };
    const response = await this.authService.changePassword(
      payload.oldPassword as string,
      payload.newPassword as string
    );
    if (!response) return;
    Swal.fire({
      icon: 'success',
      text: 'Password changed successfully',
      title: 'Success',
      heightAuto: false,
    });
    this.passwordForm.reset();
  }
  openPassword() {
    const oldInput = document.getElementById('oldPassword') as HTMLInputElement;
    const newInput = document.getElementById('newPassword') as HTMLInputElement;
    const confirmInput = document.getElementById(
      'confirmPassword'
    ) as HTMLInputElement;
    console.log(oldInput, 'typeeee edjcshiush');
    if (oldInput.type === 'password') {
      oldInput.type = 'text';
      newInput.type = 'text';
      confirmInput.type = 'text';
    } else {
      oldInput.type = 'password';
      newInput.type = 'password';
      confirmInput.type = 'password';
    }
  }

  deactivateAccount() {
    if (!confirm('Are you sure you want to deactivate your account?')) return;
    console.log('Deactivating account...');
    // placeholder
    alert('Account deactivated (simulated).');
  }

  deleteAccount() {
    if (!confirm('This will delete your account permanently. Confirm?')) return;
    console.log('Deleting account...');
    // placeholder
    alert('Account deleted (simulated).');
  }

  toggleSignal(
    signalRef: { (): boolean; set: (v: boolean) => void },
    value?: boolean
  ) {
    if (typeof value === 'boolean') signalRef.set(value);
    else signalRef.set(!signalRef());
  }
  onClickUpdateImage() {
    const inputElem: HTMLInputElement = this.renderrer.createElement('input');
    this.renderrer.setAttribute(inputElem, 'type', 'file');
    this.renderrer.setAttribute(
      inputElem,
      'accept',
      'image/png, image/gif, image/jpeg'
    );
    inputElem.click();
    inputElem.onchange = (event) => {
      const elem = event.target as HTMLInputElement;
      if (elem.files?.length) {
        this.userService
          .updateMyImage(elem.files.item(0) as File)
          .then(() => {
            Swal.fire({
              icon: 'success',
              title: 'success',
              text: 'Your image has been updated successfully !',
              heightAuto: false,
            });
          })
          .catch((error) => {
            console.log(error);
          });
      }
    };
  }
  // onRemoveImage(event: Event, userMedia: Media) {
  //   event.stopPropagation();
  //   event.preventDefault();
  //   if (userMedia) {
  //     firstValueFrom(this.translate.get('youwanttoremoveprofileimage')).then(
  //       (tValue) => {
  //         Swal.fire({
  //           title: 'Warning',
  //           icon: 'warning',
  //           text: tValue,
  //           showCancelButton: true,
  //           heightAuto: false,
  //         }).then(({ value }) => {
  //           if (value) {
  //             this.userService
  //               .removeMyProfileImage(userMedia.id)
  //               .then(() => {});
  //           }
  //         });
  //       }
  //     );
  //   }
  // }
}
