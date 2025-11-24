import { Component, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SharedModule } from '../../modules/shared/shared-module';
import { Distribution } from '../../interfaces/Distribution';
import { DiscountType, DistributionType } from '../../interfaces';

@Component({
  selector: 'app-distribution-dialog',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogTitle,
  ],
  templateUrl: './distribution-dialog.html',
  styleUrl: './distribution-dialog.css',
})
export class DistributionDialog {
  data = inject<Inputs>(MAT_DIALOG_DATA);
  form: FormGroup;
  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      distributions: this.fb.array(
        Object.values(DistributionType).map((type) =>
          this.createDistribution(type as DistributionType, null)
        )
      ),
      allowCustomPrintingPrice: this.fb.control<boolean>(false),
    });
  }

  createDistribution(type: DistributionType, amount: number | null) {
    console.log({ type });

    return this.fb.group({
      distributionType: this.fb.control<DistributionType | null>({
        value: type,
        disabled: true,
      }),
      amount: this.fb.control<number | null>(amount, Validators.required),
    });
  }

  get distributions(): FormArray<
    FormGroup<{
      amount: FormControl;
      distributionType: FormControl<DistributionType>;
    }>
  > {
    return this.form.get('distributions') as FormArray;
  }

  onSubmit() {
    if (this.form.valid) {
      this.data.onSubmit(
        this.distributions.controls.map(
          ({ controls: { amount, distributionType } }) => ({
            amount: amount.value,
            distributionType: distributionType.value,
          })
        ),
        this.form.value.allowCustomPrintingPrice || false
      );
    }
  }
}
interface Inputs {
  onClose: () => void;
  onSubmit: (payload: Distribution[], allowCustomPrintingPrice?: boolean) => void;
}
