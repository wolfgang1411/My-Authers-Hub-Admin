import {
  Component,
  computed,
  ElementRef,
  input,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
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
} from '../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../services/printing-service';
import {
  combineLatest,
  debounceTime,
  startWith,
  Subject,
  takeUntil,
} from 'rxjs';
import { getFileToBase64, selectFile } from '../../common/utils/file';
import { OnDestroy } from '@angular/core';
@Component({
  selector: 'app-title-printing',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './title-printing.html',
  styleUrl: './title-printing.css',
})
export class TitlePrinting implements OnDestroy {
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

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  insideCoverMedia = signal<FormGroup<TitleMediaGroup> | null>(null);

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

    this.documentMedia().valueChanges.subscribe((controls) => {
      const insideCover = this.documentMedia().controls.find(
        ({ controls: { type } }) => type.value === TitleMediaType.INSIDE_COVER
      );

      this.insideCoverMedia.set(insideCover || null);
    });
  }

  handleBlackAndWhitePages() {
    const colorPagesControl = this.printingGroup()['controls']['colorPages'];
    const totalPagesControl = this.printingGroup()['controls']['totalPages'];
    const blackAndWhitePagesControl =
      this.printingGroup()['controls']['bwPages'];
    combineLatest([
      colorPagesControl.valueChanges,
      totalPagesControl.valueChanges,
    ])
      .pipe(debounceTime(400))
      .subscribe(([colorPages, totalPages]) => {
        blackAndWhitePagesControl.patchValue(
          (Number(totalPages) || 0) - (Number(colorPages) || 0)
        );
      });
  }

  // createDocumentMediaGroup(
  //   mediaType: string,
  //   file: File,
  //   url: string | null = null
  // ): FormGroup {
  //   return new FormGroup<MediaGroup>({
  //     id: new FormControl(1 || 0),
  //     url: new FormControl(
  //       'https://fastly.picsum.photos/id/376/536/354.jpg?hmac=FY3pGZTc81LYCnJOB0PiRX570QylTn7xchj6FZA6TeQ'
  //     ),
  //     type: new FormControl(mediaType as MediaType),
  //     file: new FormControl(new File([], 'test.png')),
  //     mediaType: new FormControl(mediaType as MediaType),
  //     maxSize
  //   });
  // }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
