import { Component, computed, effect, input, OnInit, OnDestroy, output, signal } from '@angular/core';
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
import { PrintingService } from '../../services/printing-service';
import { UserService } from '../../services/user';
import { CommonModule } from '@angular/common';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, firstValueFrom, startWith, Subject, takeUntil } from 'rxjs';
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
  | 'marginPercent';

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
export class PrintingCalculator implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  bindingTypes = input.required<BookBindings[]>();
  paperQualityTypes = input.required<PaperQuailty[]>();
  sizeTypes = input.required<SizeCategory[]>();
  laminationTypes = input.required<LaminationType[]>();
  marginPercent = input.required<number | null>();

  onPaperQualityTypesUpdate = output<{ data: PaperQuailty; isNew: boolean }>();
  onBindingTypesUpdate = output<{ data: BookBindings; isNew: boolean }>();
  onSizeTypesUpdate = output<{ data: SizeCategory; isNew: boolean }>();
  onLaminationTypesUpdate = output<{ data: LaminationType; isNew: boolean }>();
  onMarginPercentUpdate = output<number>();

  // Filtered options based on selected size category
  filteredBindingTypes = signal<BookBindings[]>([]);
  filteredLaminationTypes = signal<LaminationType[]>([]);
  filteredPaperQualityTypes = signal<PaperQuailty[]>([]);
  
  // Store all options for fallback
  allBindingTypes = signal<BookBindings[]>([]);
  allLaminationTypes = signal<LaminationType[]>([]);
  allPaperQualityTypes = signal<PaperQuailty[]>([]);

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
  
  // Computed to check if size category is selected
  isSizeCategorySelected = computed(() => {
    return !!this.form.controls.sizeCategoryId.value;
  });

  // Computed to get selected size category's insideCoverPrice
  selectedSizeCategoryInsideCoverPrice = computed(() => {
    const sizeCategoryId = this.form.controls.sizeCategoryId.value;
    if (!sizeCategoryId) return 0;
    const sizeCategory = this.sizeTypes().find(sc => sc.id === sizeCategoryId);
    return sizeCategory?.insideCoverPrice ?? sizeCategory?.sizeCategory?.insideCoverPrice ?? 0;
  });

  // Computed to check if user is superadmin
  isSuperAdmin = computed(() => {
    return this.userService.loggedInUser$()?.accessLevel === 'SUPERADMIN';
  });
  
  constructor(
    private settingService: SettingsService,
    private printingService: PrintingService,
    private matDialog: MatDialog,
    private translateServie: TranslateService,
    private userService: UserService
  ) {
    // Watch for input changes and update all* signals
    effect(() => {
      this.allBindingTypes.set(this.bindingTypes());
      this.allLaminationTypes.set(this.laminationTypes());
      this.allPaperQualityTypes.set(this.paperQualityTypes());
      
      // Reload filtered options if size category is selected
      const sizeCategoryId = this.form.controls.sizeCategoryId.value;
      if (sizeCategoryId) {
        this.loadOptionsBySizeCategory(sizeCategoryId);
      } else {
        // If no size selected, show all options
        this.filteredBindingTypes.set(this.allBindingTypes());
        this.filteredLaminationTypes.set(this.allLaminationTypes());
        this.filteredPaperQualityTypes.set(this.allPaperQualityTypes());
      }
    });
  }
  
  async ngOnInit(): Promise<void> {
    // Initialize all options from inputs
    this.allBindingTypes.set(this.bindingTypes());
    this.allLaminationTypes.set(this.laminationTypes());
    this.allPaperQualityTypes.set(this.paperQualityTypes());

    // Set up listener for size category changes
    this.form.controls.sizeCategoryId.valueChanges
      .pipe(
        startWith(this.form.controls.sizeCategoryId.value),
        takeUntil(this.destroy$)
      )
      .subscribe(async (sizeCategoryId) => {
        await this.loadOptionsBySizeCategory(sizeCategoryId);
      });

    // Load options for initial size category if set
    const initialSizeCategoryId = this.form.controls.sizeCategoryId.value;
    if (initialSizeCategoryId) {
      await this.loadOptionsBySizeCategory(initialSizeCategoryId);
    } else {
      // If no size selected, show all options
      this.filteredBindingTypes.set(this.allBindingTypes());
      this.filteredLaminationTypes.set(this.allLaminationTypes());
      this.filteredPaperQualityTypes.set(this.allPaperQualityTypes());
    }

    this.form.valueChanges.pipe(debounceTime(600), takeUntil(this.destroy$)).subscribe(() => {
      this.updatePrice();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Update field states based on size category selection
   */
  private updateFieldStates(sizeCategoryId: number | null): void {
    if (!sizeCategoryId) {
      // Disable fields when no size category is selected
      this.form.controls.bindingTypeId.disable();
      this.form.controls.laminationTypeId.disable();
      this.form.controls.paperQuailtyId.disable();
    } else {
      // Enable fields when size category is selected
      this.form.controls.bindingTypeId.enable();
      this.form.controls.laminationTypeId.enable();
      this.form.controls.paperQuailtyId.enable();
    }
  }

  /**
   * Load binding types, lamination types, and paper qualities based on selected size category
   */
  private async loadOptionsBySizeCategory(sizeCategoryId: number | null): Promise<void> {
    // Update field states
    this.updateFieldStates(sizeCategoryId);
    
    if (!sizeCategoryId) {
      // If no size selected, show all options
      this.filteredBindingTypes.set(this.allBindingTypes());
      this.filteredLaminationTypes.set(this.allLaminationTypes());
      this.filteredPaperQualityTypes.set(this.allPaperQualityTypes());
      return;
    }

    try {
      // Fetch filtered options by size category
      const [bindings, laminations, qualities] = await Promise.all([
        this.printingService.getBindingTypesBySizeCategoryId(sizeCategoryId),
        this.printingService.getLaminationTypesBySizeCategoryId(sizeCategoryId),
        this.printingService.getPaperQualitiesBySizeCategoryId(sizeCategoryId),
      ]);

      this.filteredBindingTypes.set(bindings);
      this.filteredLaminationTypes.set(laminations);
      this.filteredPaperQualityTypes.set(qualities);

      // Reset selections if current selection is not in filtered list
      const currentBindingId = this.form.controls.bindingTypeId.value;
      if (currentBindingId && !bindings.find((b) => b.id === currentBindingId)) {
        this.form.controls.bindingTypeId.setValue(null);
      }

      const currentLaminationId = this.form.controls.laminationTypeId.value;
      if (
        currentLaminationId &&
        !laminations.find((l) => l.id === currentLaminationId)
      ) {
        this.form.controls.laminationTypeId.setValue(null);
      }

      const currentPaperQualityId = this.form.controls.paperQuailtyId.value;
      if (
        currentPaperQualityId &&
        !qualities.find((q) => q.id === currentPaperQualityId)
      ) {
        this.form.controls.paperQuailtyId.setValue(null);
      }
    } catch (error) {
      console.error('Error loading options by size category:', error);
      // Fallback to all options on error
      this.filteredBindingTypes.set(this.allBindingTypes());
      this.filteredLaminationTypes.set(this.allLaminationTypes());
      this.filteredPaperQualityTypes.set(this.allPaperQualityTypes());
    }
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
      case 'marginPercent':
        label = `Are you sure you wish to update margin percent`;
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
      case 'marginPercent':
        const marginPercentDialog = this.matDialog.open(InviteDialog, {
          data: {
            onSave: async (val: any) => {
              if (
                !(await this.showModuleUpdateOrCreateWarning(moduleType, false))
              ) {
                return;
              }
              val = Number(val);
              await this.settingService.updateMarginPercent(val);
              this.onMarginPercentUpdate.emit(val);
              marginPercentDialog.close();
            },
            onClose: () => marginPercentDialog.close(),
            heading: 'Manage margin percent',
            defaultValue: this.marginPercent(),
            placeholder: 'enterpercent',
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
            laminationTypes: this.allLaminationTypes(),
            defaultValue: this.allLaminationTypes().filter(
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
            bindingTypes: this.allBindingTypes(),
            defaultValue: this.allBindingTypes().filter(
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
            paperQualityTypes: this.allPaperQualityTypes(),
            defaultValue: this.allPaperQualityTypes().filter(
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
