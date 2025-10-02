import { Component, input } from '@angular/core';
import { PricingGroup } from '../../interfaces';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../modules/shared/shared-module';

@Component({
  selector: 'app-pricing',
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing {
  pricingControls = input.required<FormArray<PricingGroup>>();
  msp = input.required<number>();
}
