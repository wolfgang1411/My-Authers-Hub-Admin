import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  Signal,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TitleService } from '../../pages/titles/title-service';
import {
  Author,
  Publishers,
  TitleCategory,
  TitleGenre,
} from '../../interfaces';
import { MatRadioModule } from '@angular/material/radio';
import { debounceTime } from 'rxjs';
import { IsbnService } from '../../services/isbn-service';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-book-details',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    SharedModule,
    MatSelectModule,
    MatInputModule,
    MatRadioModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
  ],
  templateUrl: './book-details.html',
  styleUrl: './book-details.css',
})
export class BookDetails {
  constructor(
    private titleService: TitleService,
    private isbnService: IsbnService
  ) {}
  @Input() titleForm!: FormGroup;
  @Input({ required: true }) authorsList!: Signal<Author[]>;
  @Input({ required: true }) publishers!: Signal<Publishers[]>;
  @Output() onPublisherChangeChild = new EventEmitter<number>();
  @Output() onAuthorChangeChild = new EventEmitter<number>();
  TitleCategory = signal<TitleCategory[]>([]);
  subCategory = signal<TitleCategory[]>([]);
  tradeCategory = signal<TitleCategory[]>([]);
  TitleGenre = signal<TitleGenre[]>([]);
  _formBuilder = inject(FormBuilder);
  isbnVerified = signal<boolean | null>(null);
  @Input() isVerifying = signal<boolean>(false);
  isbnEbookVerified = signal<boolean | null>(null);
  @Input() isISBNEbookErifying = signal<boolean>(false);

  async ngOnInit() {
    const { items: category } = await this.titleService.getTitleCategory();
    this.TitleCategory.set(category);
    const { items: genre } = await this.titleService.getGenre();
    this.TitleGenre.set(genre);
    const { items: trade } = await this.titleService.getTradeCategory();
    this.tradeCategory.set(trade);
    const categoryId = (this.titleForm.controls['titleDetails'] as any)?.[
      'controls'
    ]?.['category']?.value;
    if (categoryId) {
      const { items: subCategory } = await this.titleService.getSubcategory(
        Number(categoryId)
      );
      this.subCategory.set(subCategory);
    }

    this.titleForm
      .get('titleDetails.category')
      ?.valueChanges.subscribe((value) => {
        const subCategoryControl = this.titleForm.get(
          'titleDetails.subCategory'
        );
        if (value) {
          subCategoryControl?.enable();
        } else {
          subCategoryControl?.disable();
          subCategoryControl?.reset();
        }
      });

    this.titleForm
      .get('titleDetails')
      ?.valueChanges.pipe(debounceTime(300))
      .subscribe(() => {
        if (
          this.titleForm.get('titleDetails.keywordOption')?.value === 'auto'
        ) {
          this.generateKeywordsAutomatically();
        }
      });
  }
  get titleDetailsCtrl() {
    return this.titleForm.get('titleDetails') as FormGroup;
  }
  get authorIds(): FormArray {
    return this.titleForm.get('titleDetails.authorIds') as FormArray;
  }

  async getSubcategory(categoryId: number) {
    if (categoryId) {
      const { items: subCategory } = await this.titleService.getSubcategory(
        categoryId
      );
      this.subCategory.set(subCategory);
    }
  }
  generateKeywordsAutomatically() {
    const titleDetails = this.titleForm.get('titleDetails')?.value;
    const authorsArray = this.titleForm.get(
      'titleDetails.authorIds'
    ) as FormArray;
    let authorsNames = '';
    if (authorsArray && authorsArray.length > 0) {
      authorsNames = authorsArray.controls
        .map(
          (authorGroup) =>
            authorGroup.get('name')?.value ||
            authorGroup.get('displayName')?.value ||
            ''
        )
        .filter((name) => name.trim() !== '')
        .join('; ');
    }
    const bookName = titleDetails.name || '';
    const category = this.getCategoryNameById(titleDetails.category) || '';
    const subCategory =
      this.getSubCategoryNameById(titleDetails.subCategory) || '';
    const subject = titleDetails.subject || '';
    const publisherName = titleDetails.publisher.displayName || '';
    const genre = this.getGenreNameById(titleDetails.genre) || '';
    const trade = this.getTrade(titleDetails.tradeCategory || '');

    // Combine all values into one string, filter out empty strings
    const keywords = [
      bookName,
      authorsNames,
      category,
      subCategory,
      subject,
      publisherName,
      genre,
      trade,
    ]
      .filter((val) => val.trim() !== '')
      .join('; ');

    this.titleForm.get('titleDetails.autoKeywords')?.setValue(keywords);
  }
  getCategoryNameById(id: string) {
    const cat = this.TitleCategory().find((c) => c.id === +id);
    return cat ? cat.name : '';
  }
  getSubCategoryNameById(id: string) {
    const cat = this.subCategory().find((c) => c.id === +id);
    return cat ? cat.name : '';
  }
  getGenreNameById(id: string) {
    const cat = this.TitleGenre().find((c) => c.id === +id);
    return cat ? cat.name : '';
  }
  getTrade(id: string) {
    const cat = this.tradeCategory().find((c) => c.id === +id);
    return cat ? cat.name : '';
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
      this.titleForm
        .get('titleDetails.publisherDisplay')
        ?.setValue(selected.name);
    }
    console.log(pubGroup, 'publisherrr');
  }
  onPublisherKeepSameChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const pubGroup = this.titleForm.get('titleDetails.publisher') as FormGroup;
    const publisherId = pubGroup.get('id')?.value;
    const selected = this.publishers().find((p) => p.id === publisherId);

    if (checked && selected) {
      pubGroup.get('displayName')?.setValue(selected.name);
      this.titleForm
        .get('titleDetails.publisherDisplay')
        ?.setValue(selected.name);
    }
    console.log(pubGroup, 'publisherrr');
  }
  onAuthorKeepSameChange(index: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const authorCtrl = this.authorIds.at(index) as FormGroup;
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
    }
  }
  onAuthorChange(index: number, authorId: number) {
    const selected = this.authorsList().find((p) => p.id === authorId);
    const authorCtrl = this.authorIds.at(index) as FormGroup;
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
    }
  }
  addAuthor(): void {
    this.authorIds.push(
      this._formBuilder.group({
        id: [null],
        name: ['', Validators.required],
        keepSame: [true],
        displayName: [''],
      })
    );
  }
  removeAuthor(index: number): void {
    this.authorIds.removeAt(index);
  }
  async verifyIsbnPrint(): Promise<void> {
    const isbnNumber = this.titleDetailsCtrl.get('isbnPrint.isbnNumber')?.value;
    if (!isbnNumber) return;

    this.isVerifying.set(true);
    this.isbnVerified.set(null);

    try {
      const result = await this.isbnService.verifyIsbn(isbnNumber);
      if (result.verified) {
        this.isbnVerified.set(true);
        this.titleDetailsCtrl.get('isbnPrint.isbnNumber')?.setErrors(null);
      } else {
        this.isbnVerified.set(false);
        this.titleDetailsCtrl
          .get('isbnPrint.isbnNumber')
          ?.setErrors({ invalidIsbn: true });
      }
    } catch (err) {
      console.error('ISBN verification failed', err);
      this.isbnVerified.set(false);
      this.titleDetailsCtrl
        .get('isbnPrint.isbnNumber')
        ?.setErrors({ invalidIsbn: true });
    } finally {
      this.isVerifying.set(false);
    }
  }
  async verifyIsbnEbook(): Promise<void> {
    const isbnNumber = this.titleDetailsCtrl.get('isbnEbook.isbnNumber')?.value;
    if (!isbnNumber) return;
    this.isISBNEbookErifying.set(true);
    this.isbnEbookVerified.set(null);
    try {
      const result = await this.isbnService.verifyIsbn(isbnNumber);
      if (result.verified) {
        this.isbnEbookVerified.set(true);
        this.titleDetailsCtrl.get('isbnEbook.isbnNumber')?.setErrors(null);
      } else {
        this.isbnEbookVerified.set(false);
        this.titleDetailsCtrl
          .get('isbnEbook.isbnNumber')
          ?.setErrors({ invalidIsbn: true });
      }
    } catch (err) {
      console.error('ISBN verification failed', err);
      this.isbnEbookVerified.set(false);
      this.titleDetailsCtrl
        .get('isbnEbook.isbnNumber')
        ?.setErrors({ invalidIsbn: true });
    } finally {
      this.isISBNEbookErifying.set(false);
    }
  }
}
