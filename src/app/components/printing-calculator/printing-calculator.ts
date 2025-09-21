import { Component, input, OnInit, output, signal } from '@angular/core';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  SizeCategory,
  TitlePrintingCostPayload,
  TitlePrintingCostResponse,
  UpdateBindingType,
  UpdateLaminationType,
  UpdatePaperQualityType,
  UpdateSizeType,
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
import { debounceTime, firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AddUpdatePaperQuality } from '../add-update-paper-quality/add-update-paper-quality';
import { AddUpdateBindingType } from '../add-update-binding-type/add-update-binding-type';
import { AddUpdateLaminationType } from '../add-update-lamination-type/add-update-lamination-type';
import { AddUpdateSizeType } from '../add-update-size-type/add-update-size-type';
import { InviteDialog } from '../invite-dialog/invite-dialog';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

type ModuleType =
  | 'laminationType'
  | 'paperQualityType'
  | 'sizeType'
  | 'bidingType'
  | 'insideCover';

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
  constructor(
    private settingService: SettingsService,
    private matDialog: MatDialog,
    private translateServie: TranslateService
  ) {}

  bindingTypes = input.required<BookBindings[]>();
  paperQualityTypes = input.required<PaperQuailty[]>();
  sizeTypes = input.required<SizeCategory[]>();
  laminationTypes = input.required<LaminationType[]>();
  insideCoverPrice = input.required<number | null>();

  onPaperQualityTypesUpdate = output<{ data: PaperQuailty; isNew: boolean }>();
  onBindingTypesUpdate = output<{ data: BookBindings; isNew: boolean }>();
  onSizeTypesUpdate = output<{ data: SizeCategory; isNew: boolean }>();
  onLaminationTypesUpdate = output<{ data: LaminationType; isNew: boolean }>();
  onInsideCoverPriceUpdate = output<number>();

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
    if (this.form.valid) {
      const res = await this.settingService.fetchPrintingCost(
        this.form.value as any
      );
      this.calculation.set(res);
    }
  }

  async showModuleUpdateOrCreateWarning(module: ModuleType, isNew: boolean) {
    let label = '';
    switch (module) {
      case 'bidingType':
        label = isNew
          ? `Are you sure you wish to create new binding type`
          : `Are you sure you wish to update binding type`;
        break;
      case 'insideCover':
        label = `Are you sure you wish to update inside cover amount`;
        break;
      case 'laminationType':
        label = isNew
          ? `Are you sure you wish to create new lamination type`
          : `Are you sure you wish to update lamination type`;
        break;
      case 'paperQualityType':
        label = isNew
          ? `Are you sure you wish to create new paper quality type`
          : `Are you sure you wish to update quality type`;
        break;
      case 'sizeType':
        label = isNew
          ? `Are you sure you wish to create new size type`
          : `Are you sure you wish to update size type`;
        break;
    }

    const { value } = await Swal.fire({
      icon: 'warning',
      title: await firstValueFrom(this.translateServie.get('warning')),
      html: await firstValueFrom(this.translateServie.get(label)),
      showCancelButton: true,
    });

    return !!value;
  }

  updateRate(moduleType: ModuleType) {
    switch (moduleType) {
      case 'insideCover':
        const insideCoverDialog = this.matDialog.open(InviteDialog, {
          data: {
            onSave: async (val: any) => {
              if (
                !(await this.showModuleUpdateOrCreateWarning(moduleType, false))
              ) {
                return;
              }
              val = Number(val);
              await this.settingService.updateInsideCoverAmount(val);
              this.insideCoverPrice = val;
              insideCoverDialog.close();
            },
            onClose: () => insideCoverDialog.close(),
            heading: 'Manage inside cover rate',
            defaultValue: this.insideCoverPrice(),
            placeholder: 'enteramount',
            validators: [Validators.required],
            type: 'number',
          },
        });
        break;
      case 'sizeType':
        const sizeDialog = this.matDialog.open(AddUpdateSizeType, {
          data: {
            sizeTypes: this.sizeTypes(),
            defaultValue: this.sizeTypes().filter(
              ({ id }) => id == this.form.controls.sizeCategoryId.value
            )[0],
            onClose: () => sizeDialog.close(),
            onSubmit: async (data: UpdateSizeType) => {
              try {
                if (
                  !(await this.showModuleUpdateOrCreateWarning(
                    moduleType,
                    !data.id
                  ))
                ) {
                  return;
                }
                const response =
                  await this.settingService.createOrUpdateSizeType(data);
                this.onSizeTypesUpdate.emit({
                  data: response,
                  isNew: !data.id,
                });
                sizeDialog.close();
              } catch (error) {
                console.log(error);
              }
            },
          },
        });
        break;
      case 'laminationType':
        const laminationDialog = this.matDialog.open(AddUpdateLaminationType, {
          data: {
            laminationTypes: this.laminationTypes(),
            defaultValue: this.laminationTypes().filter(
              ({ id }) => id == this.form.controls.laminationTypeId.value
            )[0],
            onClose: () => laminationDialog.close(),
            onSubmit: async (data: UpdateLaminationType) => {
              try {
                if (
                  !(await this.showModuleUpdateOrCreateWarning(
                    moduleType,
                    !data.id
                  ))
                ) {
                  return;
                }
                const response =
                  await this.settingService.createOrUpdateLaminationType(data);
                this.onLaminationTypesUpdate.emit({
                  data: response,
                  isNew: !data.id,
                });
                laminationDialog.close();
              } catch (error) {
                console.log(error);
              }
            },
          },
        });
        break;
      case 'bidingType':
        const bindingDialog = this.matDialog.open(AddUpdateBindingType, {
          data: {
            bindingTypes: this.bindingTypes(),
            defaultValue: this.bindingTypes().filter(
              ({ id }) => id == this.form.controls.bindingTypeId.value
            )[0],
            onClose: () => bindingDialog.close(),
            onSubmit: async (data: UpdateBindingType) => {
              try {
                if (
                  !(await this.showModuleUpdateOrCreateWarning(
                    moduleType,
                    !data.id
                  ))
                ) {
                  return;
                }
                const response =
                  await this.settingService.createOrUpdateBindingType(data);
                this.onBindingTypesUpdate.emit({
                  data: response,
                  isNew: !data.id,
                });
                bindingDialog.close();
              } catch (error) {
                console.log(error);
              }
            },
          },
        });
        break;
      case 'paperQualityType':
        const qualityDialog = this.matDialog.open(AddUpdatePaperQuality, {
          data: {
            paperQualityTypes: this.paperQualityTypes(),
            defaultValue: this.paperQualityTypes().filter(
              ({ id }) => id == this.form.controls.paperQuailtyId.value
            )[0],
            onClose: () => qualityDialog.close(),
            onSubmit: async (data: UpdatePaperQualityType) => {
              try {
                if (
                  !(await this.showModuleUpdateOrCreateWarning(
                    moduleType,
                    !data.id
                  ))
                ) {
                  return;
                }
                const response =
                  await this.settingService.createOrPaperQualityType(data);
                this.onPaperQualityTypesUpdate.emit({
                  data: response,
                  isNew: !data.id,
                });
                qualityDialog.close();
              } catch (error) {
                console.log(error);
              }
            },
          },
        });
        break;
    }
  }
}
