import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import { UserService } from 'src/app/services/user';

@Component({
  selector: 'app-add-wallet-amount',
  imports: [
    SharedModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  templateUrl: './add-wallet-amount.html',
  styleUrl: './add-wallet-amount.css',
})
export class AddWalletAmount implements OnInit, OnDestroy {
  constructor() {
    effect(() => {
      const accessLevel = this.userService.loggedInUser$()?.accessLevel;
      const isMethodRequired = accessLevel !== 'SUPERADMIN';
      this.method[isMethodRequired ? 'enable' : 'disable']();

      this.method.updateValueAndValidity();
    });
  }

  destroy$ = new Subject();
  userService = inject(UserService);
  data = inject<Inputs>(MAT_DIALOG_DATA);

  availableWalletAmount = computed(() => {
    const totalAmount =
      this.userService.loggedInUser$()?.wallet?.totalAmount || 0;
    const holdAmount =
      this.userService.loggedInUser$()?.wallet?.holdAmount || 0;
    const availabeAmount = totalAmount - holdAmount;
    return availabeAmount;
  });
  accessLevel = computed(() => {
    return this.userService.loggedInUser$()?.accessLevel;
  });

  amount = new FormControl(null, {
    validators: [Validators.required, Validators.min(1)],
  });
  method = new FormControl<'GATEWAY' | 'WALLET'>('GATEWAY', {
    validators: [Validators.required],
  });
  sendMails = new FormControl(true);
  validators = Validators;

  ngOnInit(): void {
    this.method.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((method) => {
        const availableAmount = this.availableWalletAmount();

        if (method === 'WALLET') {
          this.amount.setValidators([
            Validators.required,
            Validators.max(availableAmount),
            Validators.min(1),
          ]);
        } else {
          this.amount.setValidators([Validators.required, Validators.min(1)]);
        }

        this.amount.updateValueAndValidity();
      });
  }

  onSubmit() {
    console.log({
      amount: this.amount.valid,
      method: this.method.valid,
    });

    if (!this.amount.valid || (!this.method.valid && this.method.enabled))
      return;

    this.data.onSubmit({
      amount: this.amount.value!,
      method: this.method.value!,
      sendMails: this.sendMails.value || false,
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }
}

interface Inputs {
  onSubmit: (data: {
    amount: number;
    method?: 'GATEWAY' | 'WALLET';
    sendMails: boolean;
  }) => void;
  onClose: () => void;
}
