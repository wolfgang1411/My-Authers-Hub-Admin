import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  AccessLevel,
  AccessLevelEnum,
  MyNotification,
  UpdateNotification,
} from '../../interfaces';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  NgxMatDatepickerActions,
  NgxMatDatepickerApply,
  NgxMatDatepickerCancel,
  NgxMatDatepickerClear,
  NgxMatDatepickerInput,
  NgxMatDatetimepicker,
} from '@ngxmc/datetime-picker';
import { provideDateFnsAdapter } from 'ngx-material-date-fns-adapter';
import { MyDatePipe } from '../../pipes/my-date-pipe';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'yyyy-MM-dd HH:mm',
  },
  display: {
    dateInput: 'yyyy-MM-dd HH:mm', // <-- this is what shows in input
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

@Component({
  selector: 'app-add-update-notification',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    NgxMatDatepickerInput,
    NgxMatDatetimepicker,
    NgxMatDatepickerActions,
    NgxMatDatepickerCancel,
    NgxMatDatepickerApply,
    MyDatePipe,
  ],
  providers: [
    provideDateFnsAdapter(),
    { provide: 'NGX_MAT_DATE_FORMATS', useValue: MY_DATE_FORMATS },
  ],
  templateUrl: './add-update-notification.html',
  styleUrl: './add-update-notification.css',
})
export class AddUpdateNotification implements OnInit {
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    title: new FormControl('', [Validators.required]),
    message: new FormControl('', [Validators.required]),
    sendAt: new FormControl<Date | string | null | undefined>(null, {}),
    byAccessLevel: new FormControl<AccessLevel | null | undefined>(null, {}),
  });

  accessLevelOptions = signal(
    Object.keys(AccessLevelEnum).filter(
      (key) => key !== 'SUPERADMIN' && key.length > 1
    )
  );

  ngOnInit(): void {
    if (this.data.notification) {
      console.log(this.data.notification);

      this.form.patchValue(this.data.notification);
    }
  }

  onSubmit() {
    if (this.form.valid) {
      let sendAt = this.form.controls.sendAt.value;
      if (sendAt && sendAt instanceof Date) {
        sendAt = sendAt.toISOString();
      }
      this.data.onSubmit({
        title: this.form.controls.title.value as string,
        message: this.form.controls.message.value as string,
        sendAt: sendAt as string,
        byAccessLevel: this.form.controls.byAccessLevel.value as AccessLevel,
      });
    }
  }
}

interface Inputs {
  notification?: MyNotification;
  onSubmit: (data: UpdateNotification) => void;
  onClose: () => void;
}
