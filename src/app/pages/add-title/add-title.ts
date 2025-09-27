import {
  Binding,
  Component,
  ElementRef,
  inject,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { map, Observable } from 'rxjs';
import {
  StepperOrientation,
  StepperSelectionEvent,
} from '@angular/cdk/stepper';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { MatStepperIntl, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import {
  Author,
  BookBindings,
  LaminationType,
  Media,
  MediaType,
  PaperType,
  Publishers,
  Title,
  TitleCategory,
  TitleCreate,
  TitleGenre,
  TitleStatus,
} from '../../interfaces';
import { MatSelectModule } from '@angular/material/select';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../services/printing-service';
// import * as pdfjsLib from 'pdfjs-dist';
import { TitlePrinting } from '../../components/title-printing/title-printing';
import { Royalties } from '../../components/royalties/royalties';
import { TitleService } from '../titles/title-service';
import { BookingDetails } from '../booking-details/booking-details';
import { BookDetails } from '../../components/book-details/book-details';
import { response } from 'express';

@Component({
  selector: 'app-add-title',
  providers: [{ provide: MatStepperIntl, useClass: MatStepperIntl }],
  imports: [
    MatRadioModule,
    FormsModule,
    MatStepperModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    SharedModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatCardModule,
    Royalties,
    TitlePrinting,
    BookDetails,
  ],
  templateUrl: './add-title.html',
  styleUrl: './add-title.css',
})
export class AddTitle {
  constructor(
    private printingService: PrintingService,
    private titleService: TitleService,
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private route: ActivatedRoute
  ) {
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
    this.route.params.subscribe(({ titleId }) => {
      this.titleId = titleId;
    });
  }
  @ViewChildren('fileInput') fileInputs!: QueryList<
    ElementRef<HTMLInputElement>
  >;

  stepperOrientation: Observable<StepperOrientation>;
  bindingType!: BookBindings[];
  laminationTypes!: LaminationType[];
  _formBuilder = inject(FormBuilder);
  titleForm!: FormGroup;
  authorsSignal = signal<Author[]>([]);
  publisherSignal = signal<Publishers | null>(null);
  titleId!: number;
  publishers = signal<Publishers[]>([]);
  authorsList = signal<Author[]>([]);
  isVerifying = signal<boolean>(false);
  isISBNEbookErifying = signal<boolean>(false);
  titleDetails = signal<Title | null>(null);

  onAuthorChangeChild(authorId: number) {
    const author = this.authorsList().find((a) => a.id === authorId);
    if (!author) return;

    const current = this.authorsSignal();
    if (!current.some((a) => a.id === author.id)) {
      this.authorsSignal.set([...current, author]);
    }
  }

  onPublisherChangeChild(publisherid: number) {
    const publisher = this.publishers().find((a) => a.id === publisherid);
    if (!publisher) return;
    this.publisherSignal.set(publisher);
  }

  getDocumentLabel(mediaType: MediaType): string {
    switch (mediaType) {
      case 'FullCover':
        return 'Upload Full Cover (PDF)';
      case 'PrintInterior':
        return 'Upload Print Interior (PDF)';
      case 'FrontCover':
        return 'Upload Front Cover (JPG/PNG)';
      case 'BackCover':
        return 'Upload Back Cover (Optional)';
      default:
        return 'Upload File';
    }
  }

  getHelperText(mediaType: MediaType): string {
    switch (mediaType) {
      case 'FullCover':
        return 'PDF, max 20MB';
      case 'PrintInterior':
        return 'PDF, max 10MB';
      case 'FrontCover':
        return 'JPG or PNG, max 2MB';
      case 'BackCover':
        return 'Optional: JPG or PNG, max 2MB';
      default:
        return '';
    }
  }

  getAcceptedTypes(mediaType: MediaType): string {
    if (mediaType === 'PrintInterior' || mediaType === 'FullCover')
      return '.pdf';
    return 'image/*';
  }

  ngOnInit(): void {
    if (this.titleId) {
      this.titleService.getTitleById(this.titleId).then((response) => {
        this.titleDetails.set(response);
        this.prefillFormData(response);
      });
    }
    this.printingService.getBindingType().then(({ items }) => {
      this.bindingType = items;
    });
    this.publisherService.getPublishers().then(({ items }) => {
      this.publishers.set(items);
    });
    this.authorService.getAuthors().then(({ items }) => {
      this.authorsList.set(items);
    });
    this.titleForm = this._formBuilder.group({
      printingformat: [null, Validators.required],
      hasFiles: [null, Validators.required],
      publishingType: [null, Validators.required],
      titleDetails: this._formBuilder.group({
        name: ['', Validators.required],
        subTitle: [''],
        longDescription: [
          '',
          [Validators.required, this.minWordsValidator(20)],
        ],
        shortDescription: ['', Validators.required],
        edition: [null],
        language: [''],
        subject: ['', [Validators.required, this.minWordsValidator(5)]],
        status: [TitleStatus.Active],
        category: [null as TitleCategory | null],
        subCategory: [null as TitleCategory | null],
        tradeCategory: [null as TitleCategory | null],
        genre: [null as TitleGenre | null],
        keywords: [''],
        isUniqueIdentifier: [false],
        keywordOption: ['auto'],
        manualKeywords: [''],
        autoKeywords: [{ value: '', disabled: true }],
        publisher: this._formBuilder.group({
          id: [null],
          name: [''],
          keepSame: [true],
          displayName: [''],
        }),
        publisherDisplay: ['', Validators.required],
        authorIds: this._formBuilder.array([
          this._formBuilder.group({
            id: [null],
            name: [''],
            keepSame: [true],
            displayName: [''],
          }),
        ]),
        isbnPrint: this._formBuilder.group({
          id: [null],
          isbnNumber: ['', [Validators.pattern(/^(97(8|9))?\d{9}(\d|X)$/)]],
          format: ['ISBN-13'],
        }),
        isbnEbook: this._formBuilder.group({
          id: [null],
          isbnNumber: ['', [Validators.pattern(/^(97(8|9))?\d{9}(\d|X)$/)]],
          format: ['ISBN-13'],
        }),
      }),
      documentMedia: this._formBuilder.array<Media>([]),
      printing: this._formBuilder.array([this.createPrintingGroup()]),
      royalties: this._formBuilder.array([]),
      distribution: this._formBuilder.group({
        type: ['', Validators.required],
      }),
    });
    this.titleForm.get('publishingType')?.valueChanges.subscribe((format) => {
      this.buildMediaArray(format);
    });
  }

  prefillFormData(data: Title): void {
    this.titleForm.patchValue({
      printingformat: null, // Update if available in data
      hasFiles: null, // Update if available in data
      publishingType: data.publishingType,
      titleDetails: {
        name: data.name,
        subTitle: data.subTitle,
        longDescription: data.longDescription,
        shortDescription: data.shortDescription,
        edition: data.edition,
        language: data.language,
        subject: data.subject,
        status: data.status || 'Active',
        category: data.category.id || null,
        subCategory: data.subCategory.id || null,
        tradeCategory: data.tradeCategory.id || null,
        genre: data.genre.id || null,
        keywords: data.keywords,
        isUniqueIdentifier: data.isUniqueIdentifier,
        keywordOption: 'auto', // default or from data
        manualKeywords: '',
        autoKeywords: { value: '', disabled: true },
        publisher: {
          id: data.publisher?.id || null,
          name: data.publisher?.name || '',
          keepSame: true,
          displayName: data.publisher?.name || '',
        },
        publisherDisplay: data.publisherDisplay || data.publisher?.name || '',
        isbnPrint: {
          id: data.isbnPrint?.id || null,
          isbnNumber: data.isbnPrint || '',
          format: 'ISBN-13',
        },
        isbnEbook: {
          id: data.isbnEbook?.id || null,
          isbnNumber: data.isbnEbook || '',
          format: 'ISBN-13',
        },
      },
      distribution: {
        type: '',
      },
    });
    const authorFGs = data.authors.map((author: any) =>
      this._formBuilder.group({
        id: [author.id],
        name: [''],
        keepSame: [true],
        displayName: [''],
      })
    );
    const authorFormArray = this._formBuilder.array(authorFGs);
    this.titleForm
      .get('titleDetails.authorIds')
      ?.setValue(authorFormArray.value);
    const printingFGs = (data.printing || []).map((printingItem: any) =>
      this.createPrintingGroup(printingItem)
    );
    const printingFormArray = this._formBuilder.array(printingFGs);
    this.titleForm.setControl('printing', printingFormArray);
    const mediaFGs = (data.media || []).map((mediaItem: any) =>
      this._formBuilder.group(mediaItem)
    );
    const mediaFormArray = this._formBuilder.array(mediaFGs);
    this.titleForm.setControl('documentMedia', mediaFormArray);
  }

  minWordsValidator(minWords: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value || '').trim();
      const wordCount = value.split(/\s+/).filter(Boolean).length;

      return wordCount < minWords
        ? { minWords: { required: minWords, actual: wordCount } }
        : null;
    };
  }
  createPrintingGroup(printingItem?: any): FormGroup {
    return this._formBuilder.group({
      id: [printingItem?.id ?? null],
      bindingType: [printingItem?.bindingType ?? null],
      bookBindingsId: [
        printingItem?.bookBindingsId ?? null,
        Validators.required,
      ],
      totalPages: [
        printingItem?.totalPages ?? null,
        [Validators.required, Validators.min(1)],
      ],
      colorPages: [
        printingItem?.colorPages ?? null,
        [Validators.required, Validators.min(0)],
      ],
      isColorPagesRandom: [printingItem?.isColorPagesRandom ?? false],
      bwPages: [printingItem?.bwPages ?? 0],
      insideCover: [printingItem?.insideCover ?? false, Validators.required],
      deliveryCharge: [printingItem?.deliveryCharge ?? 0],
      laminationType: [printingItem?.laminationType ?? null],
      laminationTypeId: [
        printingItem?.laminationTypeId ?? null,
        Validators.required,
      ],
      paperType: [
        printingItem?.paperType ?? PaperType.WHITE,
        Validators.required,
      ],
      gsm: [printingItem?.gsm ?? null],
      paperQuailtyId: [
        printingItem?.paperQuailtyId ?? null,
        Validators.required,
      ],
      bookSize: [printingItem?.bookSize ?? null],
      sizeCategoryId: [
        printingItem?.sizeCategoryId ?? null,
        Validators.required,
      ],
      printCost: [printingItem?.printCost ?? 0],
      customPrintCost: [printingItem?.customPrintCost ?? 0],
    });
  }

  formSubmit() {
    console.log(
      this.titleDetailsCtrl.value,
      'titleformmmm',
      this.titleForm.value,
      'title valueeee'
    );
  }

  get printing(): FormArray {
    return this.titleForm.get('printing') as FormArray;
  }
  get formatCtrl() {
    return this.titleForm.get('publishingType') as FormGroup;
  }
  get titleDetailsCtrl() {
    return this.titleForm.get('titleDetails') as FormGroup;
  }
  get documentMedia() {
    return this.titleForm.get('documentMedia') as FormArray;
  }

  get printCtrl() {
    return this.titleForm.get('printing') as FormGroup;
  }

  get distributionCtrl() {
    return this.titleForm.get('distribution') as FormGroup;
  }

  get publisher() {
    return this.titleForm.get('publisher') as FormGroup;
  }

  addPrinting(): void {
    this.printing.push(this.createPrintingGroup());
  }

  get royalties(): FormArray {
    return this.titleForm.get('royalties') as FormArray;
  }

  addRoyalty(): void {
    this.royalties.push(
      this._formBuilder.group({
        id: [null],
        percentage: [0, Validators.required],
        channal: [''],
        author: [null],
        publisher: [null],
        status: ['ACTIVE'],
      })
    );
  }

  addDefaultMedia() {
    this.documentMedia.clear();
    this.documentMedia.push(this.createMedia('FullCover', true));
    this.documentMedia.push(this.createMedia('FrontCover', true));
    this.documentMedia.push(this.createMedia('BackCover', false));
    this.documentMedia.push(this.createMedia('PrintInterior', true));
  }

  createMedia(mediaType: MediaType, required = true): FormGroup {
    return this._formBuilder.group({
      id: [0],
      url: [''],
      type: [mediaType],
      file: [null, required ? Validators.required : []],
      mediaType: [mediaType],
    });
  }
  buildMediaArray(format: string) {
    this.documentMedia.clear();
    switch (format) {
      case 'ONLY_EBOOK':
        this.documentMedia.push(this.createMedia('FullCover', true));
        this.documentMedia.push(this.createMedia('FrontCover', true));
        break;

      case 'ONLY_PRINT':
        this.documentMedia.push(this.createMedia('FullCover', true));
        this.documentMedia.push(this.createMedia('FrontCover', true));
        this.documentMedia.push(this.createMedia('BackCover', false));
        this.documentMedia.push(this.createMedia('PrintInterior', true));
        break;

      case 'PRINT_EBOOK':
        this.documentMedia.push(this.createMedia('FullCover', true));
        this.documentMedia.push(this.createMedia('FrontCover', true));
        this.documentMedia.push(this.createMedia('BackCover', false));
        this.documentMedia.push(this.createMedia('PrintInterior', true));
        break;

      default:
        // no format selected → leave empty
        break;
    }
  }
  isRequired(control: AbstractControl | null): boolean {
    if (!control?.validator) return false;
    const validator = control.validator({} as any);
    return !!(validator && validator['required']);
  }

  onFileSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const mediaType = this.documentMedia.at(index).get('mediaType')
        ?.value as MediaType;
      const reader = new FileReader();
      reader.onload = async () => {
        const fileResult = reader.result as string;
        this.documentMedia.at(index).patchValue({
          file: file,
          url:
            mediaType === 'PrintInterior' || mediaType === 'FullCover'
              ? null
              : fileResult,
        });
        if (mediaType === 'FullCover' && file.type === 'application/pdf') {
          const typedArray = new Uint8Array(await file.arrayBuffer());
          // const pdf = await pdfjsLib.getDocument(typedArray).promise;
          // const totalPages = pdf.numPages;
          // this.printing.at(0).patchValue({ totalPages: totalPages });
          // console.log(`FullCover PDF has ${totalPages} pages`);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile(index: number) {
    this.documentMedia.at(index).patchValue({
      file: null,
      url: null,
    });
  }
  onStepChange() {
    console.log('step change triggered');
    console.log('titleForm valid:', this.titleForm.valid);
    if (this.titleForm.get('titleDetails')?.valid) {
      this.saveDraft();
    }
    if (this.titleForm.get('printing')?.valid && this.titleId) {
      this.savePrintingDraft();
    }
  }

  saveDraft() {
    const titleDetails = this.titleForm.get('titleDetails')?.value;
    const basicData: TitleCreate = {
      publishingType: this.titleForm.get('publishingType')?.value,
      isbnPrint: titleDetails.isbnPrint?.isbnNumber ?? '',
      isbnEbook: titleDetails.isbnEbook?.isbnNumber ?? '',
      categoryId: titleDetails.category,
      subCategoryId: titleDetails.subCategory,
      tradeCategoryId: titleDetails.tradeCategory,
      genreId: titleDetails.genre,
      publisherDisplay: titleDetails.publisher.displayName,
      publisherId: titleDetails.publisher.id,
      name: titleDetails.name,
      subTitle: titleDetails.subTitle,
      subject: titleDetails.subject,
      language: titleDetails.language,
      longDescription: titleDetails.longDescription,
      shortDescription: titleDetails.shortDescription,
      edition: titleDetails.edition,
      keywords: titleDetails.keywords,
      isUniqueIdentifier: false,
      authorIds:
        titleDetails.authorIds && titleDetails.authorIds.length > 0
          ? titleDetails.authorIds.map((author: any) => ({
              id: author.id,
              displayName: author.displayName || '',
            }))
          : [],
      id: this.titleId,
    };
    console.log(titleDetails, 'valuee title');
    console.log(basicData, 'basicccccc');
    this.titleService.createTitle(basicData).then((res: { id: number }) => {
      this.titleId = res.id;
    });
  }
  savePrintingDraft() {
    const printingDetails = this.titleForm.get('printing')?.value;
    console.log(printingDetails, 'printinn');
  }

  onSubmit() {}
}
