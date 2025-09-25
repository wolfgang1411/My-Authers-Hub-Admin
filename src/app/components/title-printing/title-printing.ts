import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  signal,
  ViewChild,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  BookBindings,
  LaminationType,
  PaperQuailty,
  SizeCategory,
  TitlePrinting as titlepr,
  TitlePrintingCostPayload,
} from '../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../services/printing-service';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Logger } from '../../services/logger';
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
    MatButton,
    MatProgressSpinner,
  ],
  templateUrl: './title-printing.html',
  styleUrl: './title-printing.css',
})
export class TitlePrinting {
  constructor(
    private printingService: PrintingService,
    private logger: Logger,
    private cd: ChangeDetectorRef
  ) {}
  bindingType = signal<BookBindings[]>([]);
  laminationTypes = signal<LaminationType[]>([]);
  paperQuality = signal<PaperQuailty[]>([]);
  sizeCategory = signal<SizeCategory[]>([]);
  loadingPrice: boolean = false;
  @Input() titleForm!: FormGroup;
  @Input() printing!: FormArray;
  @Input() documentMedia!: FormArray;
  @Input() _formBuilder!: FormBuilder;
  printCost = signal<number>(0);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
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
    this.printing.controls.forEach((group, index) => {
      this.setupAutoCalculations(group as FormGroup, index);
    });
    this.printing.valueChanges.subscribe(() => {
      this.printing.controls.forEach((group, index) => {
        this.setupAutoCalculations(group as FormGroup, index);
      });
    });
  }

  setupAutoCalculations(group: FormGroup, index: number) {
    group.get('colorPages')?.valueChanges.subscribe((color) => {
      const total = group.get('totalPages')?.value || 0;
      let finalColorPages = color || 0;
      if (group.get('isColorPagesRandom')?.value) {
        finalColorPages = finalColorPages * 2;
      }
      group.get('colorPages')?.setValue(finalColorPages, { emitEvent: false });
      group
        .get('bwPages')
        ?.setValue(total - finalColorPages, { emitEvent: false });
    });
    group.get('isColorPagesRandom')?.valueChanges.subscribe((isRandom) => {
      const color = group.get('colorPages')?.value || 0;
      let finalColorPages = color;
      if (isRandom) {
        finalColorPages = color * 2;
      }
      const total = group.get('totalPages')?.value || 0;
      group
        .get('bwPages')
        ?.setValue(total - finalColorPages, { emitEvent: false });
    });
  }

  createDocumentMediaGroup(
    mediaType: string,
    file: File,
    url: string | null = null
  ): FormGroup {
    return this._formBuilder.group({
      id: [0],
      mediaType: [mediaType],
      file: [file],
      url: [url],
    });
  }
  openFileDialog() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }
  onInsideCoverUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const index = this.documentMedia.controls.findIndex(
      (ctrl) => ctrl.get('mediaType')?.value === 'InsideCover'
    );
    if (index > -1) {
      this.documentMedia.removeAt(index);
    }
    const newGroup = this.createDocumentMediaGroup('InsideCover', file);
    this.documentMedia.push(newGroup);
    input.value = '';
  }
  getFilteredLaminationTypes(print: AbstractControl): any[] {
    const bindingTypeId = print.get('bookBindingsId')?.value;
    if (!this.laminationTypes?.length) return [];
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
    this.documentMedia.removeAt(index);
  }

  urlFromFile(file: File): string {
    return URL.createObjectURL(file);
  }

  calculatePrintingCost(printGroup: AbstractControl): void {
    if (!printGroup.valid) {
      return;
    }
    this.loadingPrice = true;
    const payload: TitlePrintingCostPayload = {
      colorPages: +printGroup.get('colorPages')?.value || 10,
      bwPages: +printGroup.get('bwPages')?.value || 10,
      paperQuailtyId: printGroup.get('paperQuailtyId')?.value,
      sizeCategoryId: printGroup.get('sizeCategoryId')?.value,
      totalPages: +printGroup.get('totalPages')?.value || 20,
      laminationTypeId: printGroup.get('laminationTypeId')?.value,
      isColorPagesRandom: printGroup.get('isColorPagesRandom')?.value,
      bindingTypeId: printGroup.get('bookBindingsId')?.value,
      insideCover: printGroup.get('insideCover')?.value,
    };
    this.printingService
      .getPrintingPrice(payload)
      .then((response) => {
        this.printCost.set(response.printCost);
        this.loadingPrice = false;
      })
      .catch((error) => {
        this.loadingPrice = false;
        this.logger.logError(error);
        console.error('Error calculating price:', error);
      });
  }
}
