import { Component, input } from '@angular/core';
import { PricingGroup } from '../../../interfaces';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../../modules/shared/shared-module';

@Component({
  selector: 'app-temp-pricing',
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './temp-pricing.html',
  styleUrl: './temp-pricing.css',
})
export class TempPricing {
  pricingControls = input.required<FormArray<PricingGroup>>();
  msp = input.required<number>();
  printingPrice = input.required<number | null>();
}
