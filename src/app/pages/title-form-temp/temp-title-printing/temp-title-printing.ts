import {
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  Signal,
  signal,
  viewChild,
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
import { combineLatest, debounceTime, Subject, takeUntil } from 'rxjs';
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

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  insideCoverMedia = signal<FormGroup<TitleMediaGroup> | null>(null);

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

    this.documentMedia().valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((controls) => {
        const insideCover = this.documentMedia().controls.find(
          ({ controls: { type } }) => type.value === TitleMediaType.INSIDE_COVER
        );

        this.insideCoverMedia.set(insideCover || null);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      .pipe(
        debounceTime(400),
        takeUntil(this.destroy$)
      )
      .subscribe(([colorPages, totalPages]) => {
        blackAndWhitePagesControl.patchValue(
          (Number(totalPages) || 0) - (Number(colorPages) || 0)
        );
      });
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

