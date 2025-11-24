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
  BookBindings,
  LaminationType,
  PaperQuailty,
  PrintingFormGroup,
  SizeCategory,
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
  loadingPrice: boolean = false;

  printingGroup = input.required<FormGroup<PrintingFormGroup>>();
  documentMedia = input.required<FormArray<FormGroup<TitleMediaGroup>>>();
  allowCustomPrintingPrice = input<boolean>(false);

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  insideCoverMedia = signal<FormGroup<TitleMediaGroup> | null>(null);

  // Computed to check if custom printing price field should be shown
  showCustomPrintCost = computed(() => this.allowCustomPrintingPrice());

  async ngOnInit() {
    const { items: laminations } =
      await this.printingService.getLaminationType();
    this.laminationTypes.set(laminations);
    const { items: binding } = await this.printingService.getBindingType();
    this.bindingType.set(binding);
    const { items: quality } = await this.printingService.getAllPaperTypes();
    this.paperQuality.set(quality);
    const { items: sizes } = await this.printingService.getSizeCategory();
    this.sizeCategory.set(sizes.sort((a, b) => a.id - b.id));

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
}
