import { Component, computed, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApplyOnType, DiscountType, Title } from '../../interfaces';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import { Coupon, UpdateCoupon } from '../../interfaces/Coupon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { StaticValuesService } from '../../services/static-values';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MyDatePipe } from '../../pipes/my-date-pipe';
import { threadId } from 'worker_threads';
import { start } from 'repl';

@Component({
  selector: 'app-add-update-coupon',
  imports: [
    SharedModule,
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MyDatePipe,
  ],
  templateUrl: './add-update-coupon.html',
  styleUrl: './add-update-coupon.css',
})
export class AddUpdateCoupon implements OnInit {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  staticValueService = inject(StaticValuesService);

  discountTypes = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.DiscountType || {}
    ) as DiscountType[];
  });

  applyOnTypes = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.ApplyOnType || {}
    ) as ApplyOnType[];
  });

  addCouponForm = new FormGroup({
    code: new FormControl('', [Validators.required]),
    description: new FormControl(null),
    discountType: new FormControl<DiscountType>(DiscountType.PERCENT, [
      Validators.required,
    ]),
    discountValue: new FormControl(null, [
      Validators.required,
      Validators.min(1),
    ]),
    applyOn: new FormControl(ApplyOnType.BOOK, [Validators.required]),
    startDate: new FormControl<Date | string | null>(null),
    endDate: new FormControl<Date | string | null>(null),
    usageLimit: new FormControl(null),
    userUsageLimit: new FormControl(null),
    titleId: new FormControl(null),
    autherId: new FormControl(null),
    publisherId: new FormControl(null),
  });

  ngOnInit(): void {
    if (this.data.coupon) {
      this.addCouponForm.patchValue({
        ...this.data.coupon,
        startDate: this.data.coupon.startDate
          ? new Date(this.data.coupon.startDate)
          : null,
        endDate: this.data.coupon.endDate
          ? new Date(this.data.coupon.endDate)
          : null,
      } as any);
    }
  }

  onSubmit() {
    if (this.addCouponForm.valid) {
      const values = this.addCouponForm.value;
      this.data.onSubmit({
        ...values,
        startDate: values.startDate
          ? new Date(values.startDate).toISOString()
          : null,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
      } as UpdateCoupon);
    }
  }
}

interface Inputs {
  coupon?: Coupon;
  titleList?: Title[];
  onSubmit: (data: UpdateCoupon) => void;
  onClose: () => void;
}
