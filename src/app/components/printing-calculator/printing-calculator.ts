import { Component, input, OnInit, signal } from '@angular/core';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  SizeCategory,
  TitlePrintingCostPayload,
  TitlePrintingCostResponse,
} from '../../interfaces';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SettingsService } from '../../services/settings';
import { CommonModule } from '@angular/common';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-printing-calculator',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatLabel,
    MatInput,
    MatFormField,
    MatOption,
    MatSelect,
    MatCheckboxModule,
    MatButtonModule,
  ],
  templateUrl: './printing-calculator.html',
  styleUrl: './printing-calculator.css',
})
export class PrintingCalculator implements OnInit {
  constructor(private settingService: SettingsService) {}

  bindingTypes = input.required<BookBindings[]>();
  paperQualityTypes = input.required<PaperQuailty[]>();
  sizeTypes = input.required<SizeCategory[]>();
  laminationTypes = input.required<LaminationType[]>();
  insideCoverPrice = input.required<number | null>();

  form = new FormGroup({
    bindingTypeId: new FormControl(null, {
      validators: [Validators.required],
    }),
    quantity: new FormControl(1, [Validators.required]),
    colorPages: new FormControl(0, {
      validators: [Validators.required],
    }),
    laminationTypeId: new FormControl(null, {
      validators: [Validators.required],
    }),
    paperQuailtyId: new FormControl(null, {
      validators: [Validators.required],
    }),
    sizeCategoryId: new FormControl(null, {
      validators: [Validators.required],
    }),
    totalPages: new FormControl(null, {
      validators: [Validators.required],
    }),
    insideCover: new FormControl(false, {}),
    isColorPagesRandom: new FormControl(false, {}),
  });

  calculation = signal<TitlePrintingCostResponse | null>(null);
  ngOnInit(): void {
    this.form.valueChanges.pipe(debounceTime(600)).subscribe(() => {
      this.updatePrice();
    });
  }

  async updatePrice() {
    console.log(this.form.value);

    if (this.form.valid) {
      const res = await this.settingService.fetchPrintingCost(
        this.form.value as any
      );
      this.calculation.set(res);
    }
  }

  updateRate(type: any) {}
}
