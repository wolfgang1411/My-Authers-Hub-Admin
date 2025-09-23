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
import { StepperOrientation } from '@angular/cdk/stepper';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  AbstractControl,
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
  TitleCategory,
  TitleGenre,
  TitleStatus,
} from '../../interfaces';
import { Title } from '../../interfaces/Books';
import { MatSelectModule } from '@angular/material/select';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';
import { MatIconModule } from '@angular/material/icon';
import { IsbnService } from '../../services/isbn-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../services/printing-service';
// import * as pdfjsLib from 'pdfjs-dist';
import { TitlePrinting } from '../../components/title-printing/title-printing';
import { Royalties } from '../../components/royalties/royalties';
import { BookDetails } from '../../components/book-details/book-details';

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
    BookDetails,
    Royalties,
    TitlePrinting,
  ],
  templateUrl: './add-title.html',
  styleUrl: './add-title.css',
})
export class AddTitle {
  constructor(
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private isbnService: IsbnService,
    private printingService: PrintingService
  ) {
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
  }
  @ViewChildren('fileInput') fileInputs!: QueryList<
    ElementRef<HTMLInputElement>
  >;

  stepperOrientation: Observable<StepperOrientation>;
  bindingType!: BookBindings[];
  laminationTypes!: LaminationType[];
  _formBuilder = inject(FormBuilder);
  titleForm!: FormGroup;
  publishers = signal<Publishers[]>([]);
  authorsSignal = signal<Author[]>([]);
  publisherSignal = signal<Publishers | null>(null);
  authorsList = signal<Author[]>([]);
  isbnVerified = signal<boolean | null>(null);
  isVerifying = signal<boolean>(false);

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
      format: [null, Validators.required],
      hasFiles: [null, Validators.required],
      publishingType: [null, Validators.required],
      titleDetails: this._formBuilder.group({
        name: ['', Validators.required],
        subTitle: [''],
        longDescription: [''],
        shortDescription: ['', Validators.required],
        edition: [null],
        language: [''],
        subject: [''],
        status: [TitleStatus.Active],
        category: [null as TitleCategory | null],
        subCategory: [null as TitleCategory | null],
        tradeCategory: [null as TitleCategory | null],
        genre: [null as TitleGenre | null],
        keywords: [''],
        keywordOption: ['auto'],
        manualKeywords: [''],
        autoKeywords: [{ value: '', disabled: true }],
        publisher: this._formBuilder.group({
          id: [null],
          name: [''],
          keepSame: [true],
          displayName: [''],
        }),
        authors: this._formBuilder.array([
          this._formBuilder.group({
            id: [null],
            name: [''],
            keepSame: [true],
            displayName: [''],
          }),
        ]),
        isbn: this._formBuilder.group({
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
    this.titleForm.get('format')?.valueChanges.subscribe((format) => {
      this.buildMediaArray(format);
    });
  }

  createPrintingGroup(): FormGroup {
    return this._formBuilder.group({
      id: [null],
      bindingType: [null],
      bookBindingsId: [null, Validators.required],
      totalPages: [null, [Validators.required, Validators.min(1)]],
      colorPages: [null, [Validators.required, Validators.min(0)]],
      isColorPagesRandom: [false],
      bwPages: [0],
      insideCover: [false, Validators.required],
      deliveryCharge: [0],
      laminationType: [null],
      laminationTypeId: [null, Validators.required],
      paperType: [PaperType.WHITE, Validators.required],
      gsm: [null],
      paperQuailtyId: [null, Validators.required],
      bookSize: [null],
      sizeCategoryId: [null, Validators.required],
      printCost: [0],
      customPrintCost: [0],
    });
  }

  get authors(): FormArray {
    return this.titleForm.get('titleDetails.authors') as FormArray;
  }
  onPublisherChange(publisherId: number) {
    const selected = this.publishers().find((p) => p.id === publisherId);
    const pubGroup = this.titleForm.get('titleDetails.publisher') as FormGroup;
    if (!pubGroup) {
      console.error('Publisher group not found in form');
      return;
    }
    const keepSame = pubGroup.get('keepSame')?.value;
    if (keepSame && selected) {
      pubGroup.get('displayName')?.setValue(selected.name);
      pubGroup.get('displayName')?.disable();
    } else {
      pubGroup.get('displayName')?.enable();
    }
  }
  onPublisherKeepSameChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const pubGroup = this.titleForm.get('titleDetails.publisher') as FormGroup;
    const publisherId = pubGroup.get('id')?.value;
    const selected = this.publishers().find((p) => p.id === publisherId);

    if (checked && selected) {
      pubGroup.get('displayName')?.setValue(selected.name);
      pubGroup.get('displayName')?.disable();
    } else {
      pubGroup.get('displayName')?.enable();
    }
  }
  onAuthorKeepSameChange(index: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const authorCtrl = this.authors.at(index) as FormGroup;
    const authorId = authorCtrl.get('id')?.value;
    const selected = this.authorsList().find((a) => a.id === authorId);

    if (checked && selected) {
      authorCtrl
        .get('displayName')
        ?.setValue(
          selected.user?.firstName +
            ' ' +
            selected.user?.lastName +
            `(${selected.username})`
        );
      authorCtrl.get('displayName')?.disable();
    } else {
      authorCtrl.get('displayName')?.enable();
    }
  }
  onAuthorChange(index: number, authorId: number) {
    const selected = this.authorsList().find((p) => p.id === authorId);
    const authorCtrl = this.authors.at(index) as FormGroup;
    const keepSame = authorCtrl.get('keepSame')?.value;
    if (keepSame && selected) {
      console.log(selected, authorCtrl, 'authoorr');
      authorCtrl
        .get('displayName')
        ?.setValue(
          selected.user?.firstName +
            ' ' +
            selected.user?.lastName +
            `(${selected.username})`
        );
      authorCtrl.get('displayName')?.disable();
    } else {
      authorCtrl.get('displayName')?.enable();
    }
  }
  addAuthor(): void {
    this.authors.push(
      this._formBuilder.group({
        id: [null],
        name: ['', Validators.required],
        keepSame: [true],
        displayName: [''],
      })
    );
  }
  removeAuthor(index: number): void {
    this.authors.removeAt(index);
  }
  get printing(): FormArray {
    return this.titleForm.get('printing') as FormArray;
  }
  get formatCtrl() {
    return this.titleForm.get('format') as FormGroup;
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

  async verifyIsbn(): Promise<void> {
    const isbnNumber = this.titleDetailsCtrl.get('isbn.isbnNumber')?.value;
    if (!isbnNumber) return;

    this.isVerifying.set(true);
    this.isbnVerified.set(null);

    try {
      const result = await this.isbnService.verifyIsbn(isbnNumber);
      if (result.verified) {
        this.isbnVerified.set(true);
        this.titleDetailsCtrl.get('isbn.isbnNumber')?.setErrors(null);
      } else {
        this.isbnVerified.set(false);
        this.titleDetailsCtrl
          .get('isbn.isbnNumber')
          ?.setErrors({ invalidIsbn: true });
      }
    } catch (err) {
      console.error('ISBN verification failed', err);
      this.isbnVerified.set(false);
      this.titleDetailsCtrl
        .get('isbn.isbnNumber')
        ?.setErrors({ invalidIsbn: true });
    } finally {
      this.isVerifying.set(false);
    }
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
      case 'ebookOnly':
        this.documentMedia.push(this.createMedia('FullCover', true));
        this.documentMedia.push(this.createMedia('FrontCover', true));
        break;

      case 'printOnly':
        this.documentMedia.push(this.createMedia('FullCover', true));
        this.documentMedia.push(this.createMedia('FrontCover', true));
        this.documentMedia.push(this.createMedia('BackCover', false));
        this.documentMedia.push(this.createMedia('PrintInterior', true));
        break;

      case 'printAndEbook':
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
  onSubmit() {
    if (this.titleForm.valid) {
      const payload: Title = this.titleForm.value as Title;
      console.log('Submitting:', payload);
      // TODO: call API
    } else {
      this.titleForm.markAllAsTouched();
    }
  }
}
