import {
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  Input,
  Signal,
  signal,
  viewChild,
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
  MediaGroup,
  MediaType,
  PaperQuailty,
  PrintingFormGroup,
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
import { combineLatest, debounceTime, from, switchMap } from 'rxjs';
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
    private _cdr: ChangeDetectorRef
  ) {}

  bindingType = signal<BookBindings[]>([]);
  laminationTypes = signal<LaminationType[]>([]);
  paperQuality = signal<PaperQuailty[]>([]);
  sizeCategory = signal<SizeCategory[]>([]);
  loadingPrice: boolean = false;

  printingGroup = input.required<FormGroup<PrintingFormGroup>>();
  documentMedia = input.required<FormArray<FormGroup<MediaGroup>>>();

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  channalTypes = input<string[]>();

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
        console.log({ blackAndWhitePagesControl });

        blackAndWhitePagesControl.patchValue(
          (Number(totalPages) || 0) - (Number(colorPages) || 0)
        );
      });
  }

  createDocumentMediaGroup(
    mediaType: string,
    file: File,
    url: string | null = null
  ): FormGroup {
    return new FormGroup<MediaGroup>({
      id: new FormControl(1 || 0),
      url: new FormControl(
        'https://fastly.picsum.photos/id/376/536/354.jpg?hmac=FY3pGZTc81LYCnJOB0PiRX570QylTn7xchj6FZA6TeQ'
      ),
      type: new FormControl(mediaType as MediaType),
      file: new FormControl(new File([], 'test.png')),
      mediaType: new FormControl(mediaType as MediaType),
    });
  }
  openFileDialog() {
    this.fileInput()?.nativeElement?.click();
  }

  onInsideCoverUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const index = this.documentMedia().controls.findIndex(
      (ctrl) => ctrl.get('mediaType')?.value === 'InsideCover'
    );
    if (index > -1) {
      this.documentMedia().removeAt(index);
    }
    const newGroup = this.createDocumentMediaGroup('InsideCover', file);
    this.documentMedia().push(newGroup);
    input.value = '';
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
