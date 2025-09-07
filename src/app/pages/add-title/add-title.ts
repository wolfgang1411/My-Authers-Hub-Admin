import { Component, inject, signal } from '@angular/core';
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
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './add-title.html',
  styleUrl: './add-title.css',
})
export class AddTitle {
  constructor(
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private isbnService : IsbnService
  ) {
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
  }
  stepperOrientation: Observable<StepperOrientation>;

  private _formBuilder = inject(FormBuilder);
  titleForm!: FormGroup;
  publishers = signal<Publishers[]>([]);
  authorsList = signal<Author[]>([]);
  isbnVerified=signal<boolean | null>(null);
isVerifying =signal<boolean>(false);
  ngOnInit(): void {
    this.publisherService.getPublishers().then(({ items }) => {
      this.publishers.set(items);
    });
    this.authorService.getAuthors().then(({ items }) => {
      this.authorsList.set(items);
    });
    this.titleForm = this._formBuilder.group({
      format: [null, Validators.required],
      titleDetails: this._formBuilder.group({
        name: ['', Validators.required],
        subTitle: [''],
        longDescription: ['', Validators.required],
        shortDescription: [''],
        edition: [null],
        language: ['', Validators.required],
        subject: [''],
        status: [TitleStatus.Active],
        category: [null as TitleCategory | null],
        subCategory: [null as TitleCategory | null],
        tradeCategory: [null as TitleCategory | null],
        genre: [null as TitleGenre | null],
        keywords: [''],
        publisher: this._formBuilder.group({
          id: [null],
          name: [''],
        }),
        authors: this._formBuilder.array([]),
        isbn: this._formBuilder.group({
          id: [null],
          isbnNumber: ['', [Validators.pattern(/^(97(8|9))?\d{9}(\d|X)$/)]],
          format: ['ISBN-13'],
        }),
      }),
      documents: this._formBuilder.group({
        fullCover: [null],
        printInterior: [null],
        frontCover: [null, Validators.required],
        backCover: [null],
      }),
      printing: this._formBuilder.array([this.createPrintingGroup()]),
      royalties: this._formBuilder.array([]),
      distribution: this._formBuilder.group({
        type: ['', Validators.required],
      }),
    });
  }

  createPrintingGroup(): FormGroup {
    return this._formBuilder.group({
      id: [null],
      bindingType: [null, Validators.required],
      bookBindingsId: [null],
      totalPages: [0],
      colorPages: [0],
      isColorPagesRandom: [false],
      bwPages: [0],
      insideCover: [false],
      deliveryCharge: [0],
      laminationType: [null],
      laminationTypeId: [null],
      paperType: [PaperType.WHITE],
      gsm: [null],
      paperQuailtyId: [null],
      bookSize: [null],
      printCost: [0],
      customPrintCost: [0],
    });
  }

  get authors(): FormArray {
    return this.titleForm.get('titleDetails.authors') as FormArray;
  }
  onPublisherChange(selectedId: number) {
    const pub = this.publishers().find((p) => p.id === selectedId);
    this.titleDetailsCtrl
      .get('publisher')
      ?.patchValue(pub ?? { id: null, name: '' });
  }

  addAuthor(): void {
    this.authors.push(
      this._formBuilder.group({
        id: [null],
        name: ['', Validators.required],
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
  get documentCtrl() {
    return this.titleForm.get('documents') as FormGroup;
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
      this.titleDetailsCtrl.get('isbn.isbnNumber')?.setErrors({ invalidIsbn: true });
    }
  } catch (err) {
    console.error('ISBN verification failed', err);
    this.isbnVerified.set(false); 
    this.titleDetailsCtrl.get('isbn.isbnNumber')?.setErrors({ invalidIsbn: true });
  } finally {
    this.isVerifying.set(false);
  }
}

  onSubmit() {
    if (this.titleForm.valid) {
      const payload: Title = this.titleForm.value as Title;
      console.log('Submitting:', payload);
      // TODO: call API
    }
  }
}
