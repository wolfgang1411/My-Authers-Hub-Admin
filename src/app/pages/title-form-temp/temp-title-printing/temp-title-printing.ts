import {
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  Signal,
  signal,
  viewChild,
  effect,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../../modules/shared/shared-module';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  Author,
  BookBindings,
  LaminationType,
  PaperQuailty,
  PrintingFormGroup,
  SizeCategory,
  TitleDetailsFormGroup,
  TitleMediaGroup,
  TitleMediaType,
} from '../../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../../services/printing-service';
import {
  combineLatest,
  debounceTime,
  startWith,
  Subject,
  takeUntil,
} from 'rxjs';
import { getFileToBase64, selectFile } from '../../../common/utils/file';
@Component({
  selector: 'app-temp-title-printing',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './temp-title-printing.html',
  styleUrl: './temp-title-printing.css',
})
export class TempTitlePrinting implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(private printingService: PrintingService) {}

  bindingType = signal<BookBindings[]>([]);
  laminationTypes = signal<LaminationType[]>([]);
  paperQuality = signal<PaperQuailty[]>([]);
  sizeCategory = signal<SizeCategory[]>([]);
  allBindingTypes = signal<BookBindings[]>([]);
  allLaminationTypes = signal<LaminationType[]>([]);
  allPaperQualities = signal<PaperQuailty[]>([]);
  loadingPrice: boolean = false;

  printingGroup = input.required<FormGroup<PrintingFormGroup>>();
  documentMedia = input.required<FormArray<FormGroup<TitleMediaGroup>>>();
  allowCustomPrintingPrice = input<boolean>(false);
  titleDetailsGroup = input<FormGroup<TitleDetailsFormGroup> | null>(null);
  authors = input<Author[]>([]);

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  insideCoverMedia = signal<FormGroup<TitleMediaGroup> | null>(null);

  // Computed to check if custom printing price field should be shown
  showCustomPrintCost = computed(() => this.allowCustomPrintingPrice());

  async ngOnInit() {
    // Load all sizes first
    const { items: sizes } = await this.printingService.getSizeCategory();
    this.sizeCategory.set(sizes.sort((a, b) => a.id - b.id));

    // Load all items initially (for fallback)
    const { items: laminations } =
      await this.printingService.getLaminationType();
    this.allLaminationTypes.set(laminations);
    const { items: binding } = await this.printingService.getBindingType();
    this.allBindingTypes.set(binding);
    const { items: quality } = await this.printingService.getAllPaperTypes();
    this.allPaperQualities.set(quality);

    // Set up listener for size changes
    this.printingGroup()
      .controls.sizeCategoryId.valueChanges.pipe(
        startWith(this.printingGroup().controls.sizeCategoryId.value),
        takeUntil(this.destroy$)
      )
      .subscribe(async (sizeId) => {
        await this.loadOptionsBySize(sizeId);
      });

    const defaultBindingType = this.bindingType().find(
      ({ name }) => name === 'Paperback'
    )?.id;

    const defaultLaminationType = this.laminationTypes().find(
      ({ name }) => name == 'Matte'
    )?.id;

    const defaultPaperQuanlity = this.paperQuality().find(
      ({ name }) => name == '80 GSM'
    )?.id;

    const defaultSizeCategory = this.sizeCategory().find(
      ({ size }) => size == '5.5*8.5'
    )?.id;

    if (
      !this.printingGroup().controls.bookBindingsId.value &&
      defaultBindingType
    ) {
      this.printingGroup().controls.bookBindingsId.setValue(defaultBindingType);
    }

    if (
      !this.printingGroup().controls.laminationTypeId.value &&
      defaultLaminationType
    ) {
      this.printingGroup().controls.laminationTypeId.setValue(
        defaultLaminationType
      );
    }

    if (
      !this.printingGroup().controls.paperQuailtyId.value &&
      defaultPaperQuanlity
    ) {
      this.printingGroup().controls.paperQuailtyId.setValue(
        defaultPaperQuanlity
      );
    }

    if (
      !this.printingGroup().controls.sizeCategoryId.value &&
      defaultSizeCategory
    ) {
      this.printingGroup().controls.sizeCategoryId.setValue(
        defaultSizeCategory
      );
    }

    // Load options for initial size if set
    const initialSizeId = this.printingGroup().controls.sizeCategoryId.value;
    if (initialSizeId) {
      await this.loadOptionsBySize(initialSizeId);
    } else {
      // If no size selected, show all options
      this.bindingType.set(this.allBindingTypes());
      this.laminationTypes.set(this.allLaminationTypes());
      this.paperQuality.set(this.allPaperQualities());
    }

    this.handleBlackAndWhitePages();
    this.setupCustomPrintCostValidation();

    this.documentMedia()
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((controls) => {
        const insideCover = this.documentMedia().controls.find(
          ({ controls: { type } }) => type.value === TitleMediaType.INSIDE_COVER
        );

        this.insideCoverMedia.set(insideCover || null);
      });
  }

  /**
   * Setup validation for customPrintCost to ensure it's not lower than actual printing cost
   */
  private setupCustomPrintCostValidation(): void {
    const customPrintCostControl =
      this.printingGroup().controls.customPrintCost;
    const printingPriceControl = this.printingGroup().controls.printingPrice;

    // Watch for changes in printingPrice and validate customPrintCost
    printingPriceControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validateCustomPrintCost();
      });

    // Watch for changes in customPrintCost
    customPrintCostControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validateCustomPrintCost();
      });
  }

  /**
   * Validate that customPrintCost is not lower than actual printing cost
   */
  private validateCustomPrintCost(): void {
    const customPrintCostControl =
      this.printingGroup().controls.customPrintCost;
    const printingPriceControl = this.printingGroup().controls.printingPrice;

    const customPrintCost = customPrintCostControl.value;
    const actualPrintCost = printingPriceControl.value;

    if (
      customPrintCost !== null &&
      customPrintCost !== undefined &&
      actualPrintCost !== null &&
      actualPrintCost !== undefined &&
      customPrintCost < actualPrintCost
    ) {
      customPrintCostControl.setErrors({
        minPrintCost: {
          actualPrintCost,
          customPrintCost,
        },
      });
    } else if (customPrintCostControl.hasError('minPrintCost')) {
      // Clear error if validation passes
      const errors = { ...customPrintCostControl.errors };
      delete errors['minPrintCost'];
      customPrintCostControl.setErrors(
        Object.keys(errors).length > 0 ? errors : null
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle black and white pages calculation
   * Calculates bwPages = totalPages - colorPages
   * Works with disabled controls by using startWith to get initial values
   */
  handleBlackAndWhitePages() {
    const colorPagesControl = this.printingGroup()['controls']['colorPages'];
    const totalPagesControl = this.printingGroup()['controls']['totalPages'];
    const blackAndWhitePagesControl =
      this.printingGroup()['controls']['bwPages'];

    // Calculate initial value
    this.calculateBwPages(
      colorPagesControl,
      totalPagesControl,
      blackAndWhitePagesControl
    );

    // Listen to changes in colorPages and totalPages
    // Use startWith to get initial values (important for disabled controls)
    combineLatest([
      colorPagesControl.valueChanges.pipe(startWith(colorPagesControl.value)),
      totalPagesControl.valueChanges.pipe(startWith(totalPagesControl.value)),
    ])
      .pipe(
        debounceTime(100), // Reduced debounce for better responsiveness
        takeUntil(this.destroy$)
      )
      .subscribe(([colorPages, totalPages]) => {
        this.calculateBwPages(
          colorPagesControl,
          totalPagesControl,
          blackAndWhitePagesControl
        );
      });
  }

  /**
   * Calculate and set black and white pages
   */
  private calculateBwPages(
    colorPagesControl: FormControl,
    totalPagesControl: FormControl,
    bwPagesControl: FormControl
  ): void {
    const totalPages = Number(totalPagesControl.value || 0);
    const colorPages = Number(colorPagesControl.value || 0);
    const bwPages = Math.max(0, totalPages - colorPages);
    bwPagesControl.patchValue(bwPages, { emitEvent: false });
  }

  openFileDialog() {
    this.fileInput()?.nativeElement?.click();
  }

  async onInsideCoverUpload(event: Event) {
    const mediaGroup = this.insideCoverMedia();
    const file = (await selectFile(
      mediaGroup?.controls?.allowedFormat?.value?.[0] || 'image/*'
    )) as File;

    if (!mediaGroup || !file) return;

    mediaGroup.patchValue({
      file,
      name: file.name,
      url: await getFileToBase64(file),
    });
  }

  getFilteredLaminationTypes(print: AbstractControl): any[] {
    const bindingTypeId = print.get('bookBindingsId')?.value;
    if (!this.laminationTypes()?.length) return [];
    const bindingTypeName = this.getBindingTypeNameById(bindingTypeId);
    if (bindingTypeName?.toLowerCase() === 'paperback') {
      return this.laminationTypes(); // allow all
    }
    return this.laminationTypes().filter(
      (t) => t.name.toLowerCase() !== 'velvet'
    );
  }
  getLaminationControl(printGroup: AbstractControl): FormControl {
    return printGroup.get('laminationTypeId') as FormControl;
  }
  private getBindingTypeNameById(id: number): string | null {
    if (!id) return null;
    const binding = this.bindingType()?.find((b) => b.id === id);
    return binding ? binding.name : null;
  }

  removeInsideCover(index: number) {
    this.documentMedia().removeAt(index);
  }

  urlFromFile(file: File | null | undefined): string {
    if (!file) return '';
    return URL.createObjectURL(file);
  }

  /**
   * Load binding types, lamination types, and paper qualities based on selected size
   */
  private async loadOptionsBySize(sizeId: number | null): Promise<void> {
    if (!sizeId) {
      // If no size selected, show all options
      this.bindingType.set(this.allBindingTypes());
      this.laminationTypes.set(this.allLaminationTypes());
      this.paperQuality.set(this.allPaperQualities());
      return;
    }

    try {
      // Fetch the size to get its sizeCategoryId
      const selectedSize = await this.printingService.getSizeById(sizeId);
      if (!selectedSize || !selectedSize.sizeCategory?.id) {
        // Fallback to all options if size category not found
        this.bindingType.set(this.allBindingTypes());
        this.laminationTypes.set(this.allLaminationTypes());
        this.paperQuality.set(this.allPaperQualities());
        return;
      }

      const sizeCategoryId = selectedSize.sizeCategory.id;

      // Fetch filtered options by size category
      const [bindings, laminations, qualities] = await Promise.all([
        this.printingService.getBindingTypesBySizeCategoryId(sizeCategoryId),
        this.printingService.getLaminationTypesBySizeCategoryId(sizeCategoryId),
        this.printingService.getPaperQualitiesBySizeCategoryId(sizeCategoryId),
      ]);

      this.bindingType.set(bindings);
      this.laminationTypes.set(laminations);
      this.paperQuality.set(qualities);

      // Reset selections if current selection is not in filtered list
      const currentBindingId =
        this.printingGroup().controls.bookBindingsId.value;
      if (currentBindingId && !bindings.find((b) => b.id === currentBindingId)) {
        this.printingGroup().controls.bookBindingsId.setValue(null);
      }

      const currentLaminationId =
        this.printingGroup().controls.laminationTypeId.value;
      if (
        currentLaminationId &&
        !laminations.find((l) => l.id === currentLaminationId)
      ) {
        this.printingGroup().controls.laminationTypeId.setValue(null);
      }

      const currentPaperQualityId =
        this.printingGroup().controls.paperQuailtyId.value;
      if (
        currentPaperQualityId &&
        !qualities.find((q) => q.id === currentPaperQualityId)
      ) {
        this.printingGroup().controls.paperQuailtyId.setValue(null);
      }
    } catch (error) {
      console.error('Error loading options by size:', error);
      // Fallback to all options on error
      this.bindingType.set(this.allBindingTypes());
      this.laminationTypes.set(this.allLaminationTypes());
      this.paperQuality.set(this.allPaperQualities());
    }
  }
}
