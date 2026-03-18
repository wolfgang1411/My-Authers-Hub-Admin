import {
  Component,
  OnInit,
  OnDestroy,
  input,
  output,
  signal,
  computed,
  inject,
  viewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  AbstractControl,
  FormArray,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
import {
  Subject,
  takeUntil,
  combineLatest,
  startWith,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  Size,
  PrintingFormGroup,
  TitleMediaGroup,
  TitleMediaType,
  TitleDetailsFormGroup,
  PrintingCreate,
  TitleStatus,
} from '../../../../interfaces';
import { PrintingService } from '../../../../services/printing-service';
import { TitleService } from '../../../titles/title-service';
import { UserService } from '../../../../services/user';
import Swal from 'sweetalert2';
import { selectFile, getFileToBase64 } from '../../../../common/utils/file';

@Component({
  selector: 'app-add-title-printing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatSlideToggleModule,
    TranslateModule,
  ],
  templateUrl: './add-title-printing.html',
  styleUrl: './add-title-printing.css',
})
export class AddTitlePrinting implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly printingService = inject(PrintingService);
  private readonly userService = inject(UserService);
  private readonly titleService = inject(TitleService);

  // Inputs
  printingGroup = input.required<FormGroup<PrintingFormGroup>>();
  documentMedia = input.required<FormArray<FormGroup<TitleMediaGroup>>>();
  authors = input.required<any[]>();
  titleDetailsGroup = input<FormGroup<TitleDetailsFormGroup> | null>(null);
  titleId = input<number | null>(null);

  // Outputs
  saveComplete = output<void>();

  authorControls = computed(
    () => this.titleDetailsGroup()?.controls?.authorIds?.controls,
  );

  sizeCateogry = signal<number | null>(null);

  bindingTypes = computed(() => {
    const allBindingTypes = this.allBindingTypes();
    const sizeCateogry = this.sizeCateogry();
    console.log(allBindingTypes, sizeCateogry);
    return allBindingTypes.filter((b) => b.sizeCategoryId === sizeCateogry);
  });
  // State
  laminationTypes = computed(() => {
    const allLaminationTypes = this.allLaminationTypes();
    const sizeCateogry = this.sizeCateogry();
    return allLaminationTypes.filter((l) => l.sizeCategoryId === sizeCateogry);
  });
  paperQualities = computed(() => {
    const allPaperQualities = this.allPaperQualities();
    const sizeCateogry = this.sizeCateogry();
    return allPaperQualities.filter((p) => p.sizeCategoryId === sizeCateogry);
  });
  allSizes = signal<Size[]>([]);

  allBindingTypes = signal<BookBindings[]>([]);
  allLaminationTypes = signal<LaminationType[]>([]);
  allPaperQualities = signal<PaperQuailty[]>([]);

  insideCoverMedia = signal<FormGroup<TitleMediaGroup> | null>(null);
  loggedInUser = this.userService.loggedInUser$;
  isLoading = signal(false);

  // View Children
  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // Computed
  showCustomPrintCost = computed(() => {
    const user = this.loggedInUser();
    return (
      user?.accessLevel === 'SUPERADMIN' ||
      user?.publisher?.allowCustomPrintingPrice
    );
  });
  showAuthorCopyOption = computed(() => {
    const user = this.loggedInUser();
    return (
      user?.accessLevel === 'SUPERADMIN' ||
      user?.publisher?.allowAuthorCopyPrice
    );
  });

  async ngOnInit() {
    await this.loadInitialData();
    this.setupFormSubscriptions();
    this.setupDefaultOptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadInitialData() {
    try {
      const [sizesResp, lamsResp, bindingsResp, qualitiesResp] =
        await Promise.all([
          this.printingService.getSizeCategory(),
          this.printingService.getLaminationType(),
          this.printingService.getBindingType(),
          this.printingService.getAllPaperTypes(),
        ]);

      this.allSizes.set(sizesResp.items.sort((a, b) => a.id - b.id));
      this.allLaminationTypes.set(lamsResp.items);
      this.allBindingTypes.set(bindingsResp.items);
      this.allPaperQualities.set(qualitiesResp.items);
    } catch (error) {
      console.error('Error loading initial printing data:', error);
    }
  }

  private setupFormSubscriptions() {
    const group = this.printingGroup();

    // Size category change listener
    group.controls.sizeCategoryId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (sizeId) => {
        if (sizeId) {
          const size = this.allSizes().find((s) => s.id === sizeId);
          const sizeCategoryId = size?.sizeCategory?.id;

          if (!sizeCategoryId || sizeCategoryId === this.sizeCateogry()) return;

          const selectedBinding = this.allBindingTypes().find(
            (b) => b.id === this.printingGroup().controls.bookBindingsId.value,
          );
          const selectedLamination = this.allLaminationTypes().find(
            (l) =>
              l.id === this.printingGroup().controls.laminationTypeId.value,
          );
          const selectedPaperQuality = this.allPaperQualities().find(
            (p) => p.id === this.printingGroup().controls.paperQuailtyId.value,
          );

          if (
            selectedBinding &&
            selectedBinding.sizeCategoryId !== sizeCategoryId
          ) {
            this.printingGroup().controls.bookBindingsId.setValue(null, {
              emitEvent: false,
            });
          }

          if (
            selectedLamination &&
            selectedLamination.sizeCategoryId !== sizeCategoryId
          ) {
            this.printingGroup().controls.laminationTypeId.setValue(null, {
              emitEvent: false,
            });
          }

          if (
            selectedPaperQuality &&
            selectedPaperQuality.sizeCategoryId !== sizeCategoryId
          ) {
            this.printingGroup().controls.paperQuailtyId.setValue(null, {
              emitEvent: false,
            });
          }
          this.printingGroup().controls.realSizeCategoryId.setValue(
            sizeCategoryId,
            { emitEvent: false },
          );
          this.sizeCateogry.set(sizeCategoryId);
          this.setupDefaultOptions(true);
          // await this.loadOptionsBySize(sizeId);
        }
      });

    // Page count calculations
    combineLatest([
      group.controls.colorPages.valueChanges.pipe(
        startWith(group.controls.colorPages.value),
      ),
      group.controls.totalPages.valueChanges.pipe(
        startWith(group.controls.totalPages.value),
      ),
    ])
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(([colorPages, totalPages]) => {
        const bwPages = Math.max(0, (totalPages || 0) - (colorPages || 0));
        group.controls.bwPages.patchValue(bwPages, { emitEvent: false });
      });

    // Auto-calculate cost when form becomes valid
    group.valueChanges
      .pipe(
        startWith(group.value),
        distinctUntilChanged(),
        debounceTime(500),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        if (group.valid) {
          this.triggerCalculation();
        }
      });

    // Track inside cover media
    this.documentMedia()
      .valueChanges.pipe(
        startWith(this.documentMedia().value),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        const insideCover = this.documentMedia().controls.find(
          (c) => c.controls.type.value === TitleMediaType.INSIDE_COVER,
        );
        this.insideCoverMedia.set(insideCover || null);
      });
  }

  private setupDefaultOptions(dontSetSize = false) {
    const group = this.printingGroup();
    // Set some defaults if not already set
    if (!group.controls.paperType.value) {
      group.controls.paperType.setValue('WHITE');
    }
    if (group.controls.isColorPagesRandom.value === null) {
      group.controls.isColorPagesRandom.setValue(true);
    }
    const defaultBindingId = this.bindingTypes().find(
      (b) => b.isDefault === true,
    )?.id;
    const defaultLaminationId = this.laminationTypes().find(
      (l) => l.isDefault === true,
    )?.id;
    const defaultPaperQualityId = this.paperQualities().find(
      (p) => p.isDefault === true,
    )?.id;

    const defaultSizeId = this.allSizes().find((s) => s.isDefault === true)?.id;

    if (!group.controls.bookBindingsId.value && defaultBindingId) {
      group.controls.bookBindingsId.setValue(defaultBindingId);
    }
    if (!group.controls.laminationTypeId.value && defaultLaminationId) {
      group.controls.laminationTypeId.setValue(defaultLaminationId);
    }
    if (!group.controls.paperQuailtyId.value && defaultPaperQualityId) {
      group.controls.paperQuailtyId.setValue(defaultPaperQualityId);
    }
    if (!group.controls.sizeCategoryId.value && defaultSizeId && !dontSetSize) {
      group.controls.sizeCategoryId.setValue(defaultSizeId);
    }
  }

  private triggerCalculation() {
    this.onCalculatePrintingCost();
  }

  async onCalculatePrintingCost() {
    const group = this.printingGroup();
    if (!group.valid) {
      group.markAllAsTouched();
      return;
    }

    try {
      this.isLoading.set(true);
      const payload = {
        ...group.getRawValue(),
        titleId: this.titleId(),
        bindingTypeId: group.controls.bookBindingsId.value,
        sizeCategoryId: this.sizeCateogry(),
      };

      const response = await this.printingService.getPrintingPrice(
        payload as any,
      );

      if (
        response &&
        (group.controls.msp.value !== response.msp ||
          response.printPerItem !== group.controls.printingPrice.value)
      ) {
        group.patchValue({
          printingPrice: response.printPerItem,
          msp: response.msp,
        });
      }
    } catch (error) {
      console.error('Error calculating printing cost:', error);
      Swal.fire({
        icon: 'error',
        title: 'Calculation Failed',
        text: 'Failed to calculate printing cost. Please check your inputs.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  getFilteredLaminationTypes(): LaminationType[] {
    const bindingId = this.printingGroup().controls.bookBindingsId.value;
    if (!bindingId) return this.laminationTypes();

    const binding = this.bindingTypes().find((b) => b.id === bindingId);
    if (binding?.name.toLowerCase() === 'paperback') {
      return this.laminationTypes();
    }

    // Filter out velvet for non-paperback if required by logic
    return this.laminationTypes().filter(
      (l) => l.name.toLowerCase() !== 'velvet',
    );
  }

  async onInsideCoverUpload() {
    const media = this.insideCoverMedia();
    if (!media) return;

    try {
      const file = (await selectFile('image/*,application/pdf')) as File;
      if (file) {
        media.patchValue({
          file,
          name: file.name,
          url: await getFileToBase64(file),
        });
      }
    } catch (error) {
      console.error('Error selecting inside cover file:', error);
    }
  }

  onCustomPrintCostBlur() {
    const customPrintCostControl =
      this.printingGroup().controls.customPrintCost;
    const customPrintCost = customPrintCostControl.value;

    customPrintCostControl.markAsTouched({ onlySelf: true });

    if (
      customPrintCost === null ||
      customPrintCost === undefined ||
      customPrintCost === 0
    ) {
      customPrintCostControl.setValue(null, { emitEvent: false });
      if (customPrintCostControl.hasError('minPrintCost')) {
        const errors = { ...customPrintCostControl.errors };
        delete errors['minPrintCost'];
        customPrintCostControl.setErrors(
          Object.keys(errors).length > 0 ? errors : null,
          { emitEvent: false },
        );
      }
      return;
    }

    const isValid = this.validateCustomPrintCost();
    // console.log({ isValid });

    // if (isValid) {
    //   this.triggerCalculation();
    // }
  }

  private validateCustomPrintCost(): boolean {
    const customPrintCostControl =
      this.printingGroup().controls.customPrintCost;
    const printingPriceControl = this.printingGroup().controls.printingPrice;

    const customPrintCost = customPrintCostControl.value;
    const actualPrintCost = printingPriceControl.value;

    if (actualPrintCost === null || actualPrintCost === undefined) {
      return true;
    }

    if (
      customPrintCost === null ||
      customPrintCost === undefined ||
      customPrintCost === 0
    ) {
      if (customPrintCostControl.hasError('minPrintCost')) {
        const errors = { ...customPrintCostControl.errors };
        delete errors['minPrintCost'];
        customPrintCostControl.setErrors(
          Object.keys(errors).length > 0 ? errors : null,
          { emitEvent: false },
        );
      }
      return true;
    }

    if (
      Number(customPrintCost) < Number(actualPrintCost) &&
      this.loggedInUser()?.accessLevel !== 'SUPERADMIN'
    ) {
      customPrintCostControl.setErrors(
        {
          minPrintCost: {
            actualPrintCost,
            customPrintCost,
          },
        },
        { emitEvent: false },
      );
      return false;
    } else {
      if (customPrintCostControl.hasError('minPrintCost')) {
        const errors = { ...customPrintCostControl.errors };
        delete errors['minPrintCost'];
        customPrintCostControl.setErrors(
          Object.keys(errors).length > 0 ? errors : null,
          { emitEvent: false },
        );
      }
      return true;
    }
  }

  async onSavePrintingDetails() {
    const group = this.printingGroup();
    console.log(group.value);

    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }

    try {
      this.isLoading.set(true);

      // 1. Upload Inside Cover if file exists
      const insideCoverControl = this.documentMedia().controls.find(
        (c) => c.controls.type.value === TitleMediaType.INSIDE_COVER,
      );

      const titleId = this.titleId();

      if (insideCoverControl && insideCoverControl.controls.file.value) {
        if (titleId) {
          await this.titleService.uploadMedia(titleId, {
            file: insideCoverControl.controls.file.value,
            type: TitleMediaType.INSIDE_COVER,
          });
          // Clear file after upload
          insideCoverControl.controls.file.setValue(null);
        }
      }

      // 2. Prepare Printing Payload
      const formVal = group.getRawValue();

      if (!titleId) {
        throw new Error('Title ID is required to save printing details.');
      }

      const payload: PrintingCreate = {
        id: formVal.id,
        titleId: titleId,
        bindingTypeId: formVal.bookBindingsId!,
        totalPages: formVal.totalPages,
        colorPages: formVal.colorPages,
        laminationTypeId: formVal.laminationTypeId!,
        paperType: formVal.paperType as any,
        paperQuailtyId: formVal.paperQuailtyId!,
        sizeId: formVal.sizeCategoryId!, // Wait, is it sizeId or sizeCategoryId?
        sizeCategoryId: formVal.realSizeCategoryId || formVal.sizeCategoryId!,
        customPrintCost: formVal.customPrintCost || undefined,
        insideCover: !!formVal.insideCover,
        isColorPagesRandom: !!formVal.isColorPagesRandom,
        authorCopyPermissions: this.authorControls()?.map((ctrl: any) => ({
          authorId: ctrl.controls.id.value,
          allowAuthorCopy: !!ctrl.controls.allowAuthorCopy.value,
        })),
      };

      // 3. Save or Create Ticket
      const isApproved =
        this.titleDetailsGroup()?.controls.status.value ===
        TitleStatus.APPROVED;
      const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';

      if (isApproved && isPublisher) {
        await this.titleService.createTitlePrintingUpdateTicket(
          titleId,
          payload,
        );
        Swal.fire({
          icon: 'success',
          title: 'Request Sent',
          text: 'Printing update request has been sent for approval.',
        });
      } else {
        await this.titleService.createOrUpdatePrinting(payload);
      }

      this.saveComplete.emit();
    } catch (error) {
      console.error('Error saving printing details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'An error occurred while saving printing details.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
