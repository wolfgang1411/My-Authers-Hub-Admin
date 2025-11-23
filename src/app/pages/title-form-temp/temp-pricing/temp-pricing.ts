import { Component, computed, input } from '@angular/core';
import { PricingGroup } from '../../../interfaces';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../../modules/shared/shared-module';
import { StaticValuesService } from 'src/app/services/static-values';

@Component({
  selector: 'app-temp-pricing',
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './temp-pricing.html',
  styleUrl: './temp-pricing.css',
})
export class TempPricing {
  constructor(private staticValuesService: StaticValuesService) {}

  ebookMsp = computed(() => {
    return Number(this.staticValuesService.staticValues()?.EBOOK_MSP);
  });

  pricingControls = input.required<FormArray<PricingGroup>>();
  msp = input.required<number>();
  printingPrice = input.required<number | null>();
}
