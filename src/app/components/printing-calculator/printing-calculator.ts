import {
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  input,
  OnInit,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  Size,
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
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, firstValueFrom, Subject, takeUntil } from 'rxjs';
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
    MatFormField,
    MatInput,
    MatOption,
    MatSelect,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './printing-calculator.html',
  styleUrl: './printing-calculator.css',
})
export class PrintingCalculator implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private isInitialized = false;
  private sizeChangeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  bindingTypes = input.required<BookBindings[]>();
  paperQualityTypes = input.required<PaperQuailty[]>();
  sizeTypes = input.required<Size[]>();
  laminationTypes = input.required<LaminationType[]>();
  marginPercent = input.required<number | null>();

  onPaperQualityTypesUpdate = output<{ data: PaperQuailty; isNew: boolean }>();
  onBindingTypesUpdate = output<{ data: BookBindings; isNew: boolean }>();
  onSizeTypesUpdate = output<{ data: SizeCategory; isNew: boolean }>();
  onLaminationTypesUpdate = output<{ data: LaminationType; isNew: boolean }>();
  onMarginPercentUpdate = output<number>();

  // Selected size - used to access bindingTypes, laminationTypes, paperQualities in template
  selectedSize = signal<Size | null>(null);

  // All available options (from inputs) - kept for updateRate dialogs
  allBindingTypes = signal<BookBindings[]>([]);
  allLaminationTypes = signal<LaminationType[]>([]);
  allPaperQualityTypes = signal<PaperQuailty[]>([]);

  form = new FormGroup({
    bindingTypeId: new FormControl<number | null>(
      { value: null, disabled: true },
      {
        validators: [Validators.required],
      }
    ),
    quantity: new FormControl<number>(1, [Validators.required]),
    colorPages: new FormControl<number>(0, {
      validators: [Validators.required],
    }),
    laminationTypeId: new FormControl<number | null>(
      { value: null, disabled: true },
      {
        validators: [Validators.required],
      }
    ),
    paperQuailtyId: new FormControl<number | null>(
      { value: null, disabled: true },
      {
        validators: [Validators.required],
      }
    ),
    sizeCategoryId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    totalPages: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    insideCover: new FormControl<boolean>(false, {}),
    isColorPagesRandom: new FormControl<boolean>(false, {}),
  });

  // Computed to get available options from selected size
  availableBindingTypes = computed(() => {
    return this.selectedSize()?.sizeCategory?.bindingTypes || [];
  });

  availablePaperQualities = computed(() => {
    return this.selectedSize()?.sizeCategory?.paperQualities || [];
  });

  availableLaminationTypes = computed(() => {
    return this.selectedSize()?.sizeCategory?.laminationTypes || [];
  });

  calculation = signal<TitlePrintingCostResponse | null>(null);

  // Computed to check if size category is selected
  isSizeCategorySelected = computed(() => {
    return !!this.selectedSize();
  });

  // Computed to get selected size category's insideCoverPrice
  selectedSizeCategoryInsideCoverPrice = computed(() => {
    return this.selectedSize()?.sizeCategory?.insideCoverPrice ?? 0;
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
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    // Watch for input changes and update all* signals (for updateRate dialogs)
    effect(() => {
      this.allBindingTypes.set(this.bindingTypes());
      this.allLaminationTypes.set(this.laminationTypes());
      this.allPaperQualityTypes.set(this.paperQualityTypes());

      // If initialized and a size is selected, reload when inputs change
      if (this.isInitialized) {
        const currentSizeId = this.form.controls.sizeCategoryId.value;
        if (currentSizeId) {
          this.handleSizeChange(currentSizeId);
        }
      }
    });

    // Watch for sizeTypes to become available and set default size
    effect(() => {
      const sizeTypes = this.sizeTypes();

      // Only set default if initialized, sizeTypes is available, and no size is currently selected
      if (this.isInitialized && sizeTypes && sizeTypes.length > 0) {
        const currentSizeId = this.form.controls.sizeCategoryId.value;

        if (!currentSizeId) {
          const defaultSize = sizeTypes.find((s) => s.size === '5.5*8.5');
          if (defaultSize) {
            this.form.controls.sizeCategoryId.patchValue(defaultSize.id);
          }
        } else {
          // Handle initial value if already set (manually call since valueChanges won't fire)
          this.handleSizeChange(currentSizeId);
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Initialize all options from inputs
    this.allBindingTypes.set(this.bindingTypes());
    this.allLaminationTypes.set(this.laminationTypes());
    this.allPaperQualityTypes.set(this.paperQualityTypes());

    // Set default quantity to 1
    this.form.controls.quantity.setValue(1);

    // Set up listener for size category changes
    this.form.controls.sizeCategoryId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((sizeCategoryId) => {
        this.handleSizeChange(sizeCategoryId);
      });

    // Mark as initialized - this will trigger the effect() to set default size
    this.isInitialized = true;

    // Set up price calculation on form changes
    this.form.valueChanges
      .pipe(debounceTime(600), takeUntil(this.destroy$))
      .subscribe(() => {
        this.updatePrice();
      });

    // Validate colorPages doesn't exceed totalPages
    this.form.controls.totalPages.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((totalPages) => {
        const colorPages = this.form.controls.colorPages.value;
        if (
          totalPages !== null &&
          colorPages !== null &&
          colorPages > totalPages
        ) {
          this.form.controls.colorPages.setValue(totalPages, {
            emitEvent: false,
          });
        }
      });

    this.form.controls.colorPages.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((colorPages) => {
        const totalPages = this.form.controls.totalPages.value;
        if (
          totalPages !== null &&
          colorPages !== null &&
          colorPages > totalPages
        ) {
          this.form.controls.colorPages.setValue(totalPages, {
            emitEvent: false,
          });
        }
      });
  }

  ngOnDestroy(): void {
    // Clear any pending timeouts
    if (this.sizeChangeTimeoutId) {
      clearTimeout(this.sizeChangeTimeoutId);
      this.sizeChangeTimeoutId = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle size change - set selected size, reset invalid selections, and set defaults
   * This is the single method that handles all size-related logic
   */
  private handleSizeChange(sizeId: number | null): void {
    if (!sizeId) {
      // No size selected - clear selected size and disable fields
      this.selectedSize.set(null);
      this.form.controls.bindingTypeId.disable({ emitEvent: false });
      this.form.controls.laminationTypeId.disable({ emitEvent: false });
      this.form.controls.paperQuailtyId.disable({ emitEvent: false });
      // Clear all dependent field values
      this.form.controls.bindingTypeId.setValue(null, { emitEvent: false });
      this.form.controls.laminationTypeId.setValue(null, { emitEvent: false });
      this.form.controls.paperQuailtyId.setValue(null, { emitEvent: false });
      return;
    }

    // Get the selected size
    const size = this.sizeTypes().find((s) => s.id === sizeId);

    if (!size || !size.sizeCategory) {
      // Size or sizeCategory not found - clear selected size and disable fields
      this.selectedSize.set(null);
      this.form.controls.bindingTypeId.disable({ emitEvent: false });
      this.form.controls.laminationTypeId.disable({ emitEvent: false });
      this.form.controls.paperQuailtyId.disable({ emitEvent: false });
      // Clear all dependent field values
      this.form.controls.bindingTypeId.setValue(null, { emitEvent: false });
      this.form.controls.laminationTypeId.setValue(null, { emitEvent: false });
      this.form.controls.paperQuailtyId.setValue(null, { emitEvent: false });
      return;
    }

    // Get filtered options from the size's sizeCategory
    const bindings = size.sizeCategory.bindingTypes || [];
    const laminations = size.sizeCategory.laminationTypes || [];
    const qualities = size.sizeCategory.paperQualities || [];

    // Set selected size - template will use this to access bindingTypes, etc.
    this.selectedSize.set(size);

    // Enable fields when size is selected
    this.form.controls.bindingTypeId.enable({ emitEvent: false });
    this.form.controls.laminationTypeId.enable({ emitEvent: false });
    this.form.controls.paperQuailtyId.enable({ emitEvent: false });

    // Reset selections if current selection is not in filtered list
    const currentBindingId = this.form.controls.bindingTypeId.value;
    if (currentBindingId && !bindings.find((b) => b.id === currentBindingId)) {
      this.form.controls.bindingTypeId.setValue(null, { emitEvent: false });
    }

    const currentLaminationId = this.form.controls.laminationTypeId.value;
    if (
      currentLaminationId &&
      !laminations.find((l) => l.id === currentLaminationId)
    ) {
      this.form.controls.laminationTypeId.setValue(null, { emitEvent: false });
    }

    const currentPaperQualityId = this.form.controls.paperQuailtyId.value;
    if (
      currentPaperQualityId &&
      !qualities.find((q) => q.id === currentPaperQualityId)
    ) {
      this.form.controls.paperQuailtyId.setValue(null, { emitEvent: false });
    }

    // Set default values after a brief delay to ensure mat-select has rendered options
    // Use setTimeout to allow Angular to render the mat-options first
    // Clear any existing timeout to prevent memory leaks
    if (this.sizeChangeTimeoutId) {
      clearTimeout(this.sizeChangeTimeoutId);
    }
    this.sizeChangeTimeoutId = setTimeout(() => {
      // Check if value is null or undefined (not just falsy, to avoid 0 issues)
      if (
        (this.form.controls.bindingTypeId.value === null ||
          this.form.controls.bindingTypeId.value === undefined) &&
        bindings.length > 0
      ) {
        const defaultBinding =
          bindings.find((b) => b.name === 'Paperback') || bindings[0];
        if (defaultBinding) {
          this.form.controls.bindingTypeId.setValue(defaultBinding.id, {
            emitEvent: false,
          });
        }
      }

      if (
        (this.form.controls.paperQuailtyId.value === null ||
          this.form.controls.paperQuailtyId.value === undefined) &&
        qualities.length > 0
      ) {
        const defaultPaper =
          qualities.find((p) => p.name === '80 GSM') || qualities[0];
        if (defaultPaper) {
          this.form.controls.paperQuailtyId.setValue(defaultPaper.id, {
            emitEvent: false,
          });
        }
      }

      if (
        (this.form.controls.laminationTypeId.value === null ||
          this.form.controls.laminationTypeId.value === undefined) &&
        laminations.length > 0
      ) {
        const defaultLamination =
          laminations.find((l) => l.name === 'Matte') || laminations[0];
        if (defaultLamination) {
          this.form.controls.laminationTypeId.setValue(defaultLamination.id, {
            emitEvent: false,
          });
        }
      }

      // Trigger change detection to update mat-select display
      this.cdr.detectChanges();
      this.sizeChangeTimeoutId = null;
    }, 50);
  }

  async updatePrice(): Promise<void> {
    try {
      // Always ensure quantity is 1
      this.form.controls.quantity.setValue(1, { emitEvent: false });

      // Validate that colorPages doesn't exceed totalPages
      const totalPages = this.form.controls.totalPages.value;
      const colorPages = this.form.controls.colorPages.value;

      if (
        totalPages !== null &&
        colorPages !== null &&
        colorPages > totalPages
      ) {
        // Reset colorPages to totalPages if it exceeds
        this.form.controls.colorPages.setValue(totalPages, {
          emitEvent: false,
        });
      }

      if (this.form.valid) {
        const formValue = { ...this.form.value, quantity: 1 };
        const res = await this.settingService.fetchPrintingCost(
          formValue as any
        );
        this.calculation.set(res);
      }
    } catch (error) {
      console.error('Error updating price:', error);
      // Don't set calculation on error - keep previous value
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
        // Only allow super admins to update margin percent
        if (!this.isSuperAdmin()) {
          return;
        }
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
                console.error('Error updating size type:', error);
                Swal.fire({
                  icon: 'error',
                  title: await firstValueFrom(
                    this.translateServie.get('error')
                  ),
                  text: 'An error occurred while updating size type',
                });
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
                console.error('Error updating lamination type:', error);
                Swal.fire({
                  icon: 'error',
                  title: await firstValueFrom(
                    this.translateServie.get('error')
                  ),
                  text: 'An error occurred while updating lamination type',
                });
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
                console.error('Error updating binding type:', error);
                Swal.fire({
                  icon: 'error',
                  title: await firstValueFrom(
                    this.translateServie.get('error')
                  ),
                  text: 'An error occurred while updating binding type',
                });
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
                console.error('Error updating paper quality type:', error);
                Swal.fire({
                  icon: 'error',
                  title: await firstValueFrom(
                    this.translateServie.get('error')
                  ),
                  text: 'An error occurred while updating paper quality type',
                });
              }
            },
          },
        });
        break;
    }
  }
}
