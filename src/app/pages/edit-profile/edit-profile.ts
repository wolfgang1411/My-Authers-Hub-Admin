import {
  Component,
  computed,
  effect,
  Renderer2,
  Signal,
  signal,
} from '@angular/core';
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
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';
import { SafeUrlPipe } from 'src/app/pipes/safe-url-pipe';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';
import { NgxIntlTelInputModule } from 'ngx-intl-tel-input';
import {
  CountryISO,
  NgxMaterialIntlTelInputComponent,
} from 'ngx-material-intl-tel-input';

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
    NgxMaterialIntlTelInputComponent,
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
    private autherService: AuthorsService,
    private router: Router
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
  countryISO = CountryISO;
  publisher = signal<Publishers | null>(null);
  author = signal<Author | null>(null);
  loggedInUser!: Signal<User | null>;
  isEditing = signal(true);
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

  passwordForm = new FormGroup({
    oldPassword: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [Validators.required],
    }),
    newPassword: new FormControl<string | null>(null, {
      nonNullable: false,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/),
      ],
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
    this.prefillPersonalForm(userData as UpdateUser);
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

  navigateToEditPublisher() {
    const publisherId = this.loggedInUser()?.publisher?.id;
    if (publisherId) {
      this.router.navigate(['/publisher', publisherId]);
    }
  }

  navigateToEditAuthor() {
    const authorId = this.loggedInUser()?.auther?.id;
    if (authorId) {
      this.router.navigate(['/author', authorId]);
    }
  }

  navigateToUpdateTickets(tab: 'author' | 'publisher') {
    this.router.navigate(['/update-tickets'], {
      queryParams: { tab },
    });
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
