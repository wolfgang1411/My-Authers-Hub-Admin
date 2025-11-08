import {
  Component,
  EventEmitter,
  inject,
  input,
  Input,
  output,
  Output,
  Signal,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
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
  AuthorFormGroup,
  Publishers,
  PublishingType,
  TitleCategory,
  TitleDetailsFormGroup,
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

  titleId = input.required<number | null>();
  publishingType = input.required<PublishingType | string | null>();
  titleDetailsGroup = input.required<FormGroup<TitleDetailsFormGroup>>();
  authorsList = input.required<Author[]>();
  publishers = input.required<Publishers[]>();
  onPublisherChangeChild = output<number>();
  onAuthorChangeChild = output<number>();

  TitleCategory = signal<TitleCategory[]>([]);
  subCategory = signal<TitleCategory[]>([]);
  tradeCategory = signal<TitleCategory[]>([]);
  TitleGenre = signal<TitleGenre[]>([]);

  _formBuilder = inject(FormBuilder);
  isbnVerified = signal<boolean | null>(null);
  isVerifying = signal(false);
  isbnEbookVerified = signal<boolean | null>(null);
  isISBNEbookErifying = signal(false);

  languages = signal([
    'English',
    'Hindi',
    'Spanish',
    'French',
    'German',
    'Chinese',
    'Japanese',
    'Arabic',
    'Russian',
    'Portuguese',
  ]);

  async ngOnInit() {
    const { items: category } = await this.titleService.getTitleCategory();
    this.TitleCategory.set(category);

    const { items: genre } = await this.titleService.getGenre();
    this.TitleGenre.set(genre);

    const { items: trade } = await this.titleService.getTradeCategory();
    this.tradeCategory.set(trade);

    const categoryId = this.titleDetailsGroup().controls.category.value;
    if (categoryId) {
      const { items: subCategory } = await this.titleService.getSubcategory(
        Number(categoryId)
      );
      this.subCategory.set(subCategory);
    }

    this.titleDetailsGroup().controls.category.valueChanges.subscribe(
      (value) => {
        const subCategoryControl =
          this.titleDetailsGroup().controls.subCategory;
        if (value) {
          subCategoryControl.enable();
        } else {
          subCategoryControl.disable();
          subCategoryControl.reset();
        }
      }
    );

    this.titleDetailsGroup()
      .valueChanges.pipe(debounceTime(300))
      .subscribe(() => {
        if (this.titleDetailsGroup().controls.keywordOption.value === 'auto') {
          this.generateKeywordsAutomatically();
        }
      });
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
    const titleDetails = this.titleDetailsGroup().value;
    const authorsArray = this.titleDetailsGroup().controls.authorIds;
    let authorsNames = '';
    if (authorsArray && authorsArray.length > 0) {
      authorsNames = authorsArray.controls
        .map(
          (authorGroup) =>
            authorGroup.controls.name.value ||
            authorGroup.controls.displayName.value ||
            ''
        )
        .filter((name) => name.trim() !== '')
        .join('; ');
    }

    const bookName = titleDetails.name || '';
    const category =
      this.getCategoryNameById(titleDetails.category as any) || '';
    const subCategory =
      this.getSubCategoryNameById(titleDetails.subCategory as any) || '';
    const subject = titleDetails.subject || '';
    const publisherName = titleDetails.publisher?.displayName || '';
    const genre = this.getGenreNameById(titleDetails.genre as any) || '';
    const trade = this.getTrade(titleDetails.tradeCategory as any) || '';

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

    this.titleDetailsGroup().controls.autoKeywords.setValue(keywords);
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
    const pubGroup = this.titleDetailsGroup().controls.publisher;
    if (!pubGroup) return;
    const keepSame = pubGroup.controls.keepSame.value;
    if (keepSame && selected) {
      pubGroup.controls.displayName.setValue(selected.name);
      this.titleDetailsGroup().controls.publisherDisplay.setValue(
        selected.name
      );
    }
  }

  onPublisherKeepSameChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const pubGroup = this.titleDetailsGroup().controls.publisher;
    const publisherId = pubGroup.controls.id.value;
    const selected = this.publishers().find((p) => p.id === publisherId);

    if (checked && selected) {
      pubGroup.controls.displayName.setValue(selected.name);
      this.titleDetailsGroup().controls.publisherDisplay.setValue(
        selected.name
      );
    }
  }

  onAuthorKeepSameChange(index: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const authorCtrl = this.titleDetailsGroup().controls.authorIds.at(
      index
    ) as FormGroup<AuthorFormGroup>;
    const authorId = authorCtrl.controls.id.value;
    const selected = this.authorsList().find((a) => a.id === authorId);

    if (checked && selected) {
      authorCtrl.controls.displayName.setValue(
        `${selected.user?.firstName} ${selected.user?.lastName}(${selected.username})`
      );
    }
  }

  onAuthorChange(index: number, authorId: number) {
    const selected = this.authorsList().find((p) => p.id === authorId);
    const authorCtrl = this.titleDetailsGroup().controls.authorIds.at(
      index
    ) as FormGroup<AuthorFormGroup>;
    const keepSame = authorCtrl.controls.keepSame.value;
    if (keepSame && selected) {
      authorCtrl.controls.displayName.setValue(
        `${selected.user?.firstName} ${selected.user?.lastName}(${selected.username})`
      );
    }
  }

  addAuthor(): void {
    this.titleDetailsGroup().controls.authorIds.push(
      new FormGroup({
        id: new FormControl<number | null | undefined>(null),
        name: new FormControl<string | null>(null),
        keepSame: new FormControl<boolean>(true),
        displayName: new FormControl<string | null>(null),
      }) as FormGroup<AuthorFormGroup>
    );
  }

  removeAuthor(index: number): void {
    this.titleDetailsGroup().controls.authorIds.removeAt(index);
  }

  async verifyIsbnPrint(): Promise<void> {
    const isbnNumber = this.titleDetailsGroup().controls.isbnPrint.value;
    if (!isbnNumber) return;

    this.isVerifying.set(true);
    this.isbnVerified.set(null);

    try {
      const result = await this.isbnService.verifyIsbn(isbnNumber);
      if (result.verified) {
        this.isbnVerified.set(true);
        this.titleDetailsGroup().controls.isbnPrint.setErrors(null);
      } else {
        this.isbnVerified.set(false);
        this.titleDetailsGroup().controls.isbnPrint.setErrors({
          invalidIsbn: true,
        });
      }
    } catch (err) {
      console.error('ISBN verification failed', err);
      this.isbnVerified.set(false);
      this.titleDetailsGroup().controls.isbnPrint.setErrors({
        invalidIsbn: true,
      });
    } finally {
      this.isVerifying.set(false);
    }
  }

  async verifyIsbnEbook(): Promise<void> {
    const isbnNumber = this.titleDetailsGroup().controls.isbnEbook.value;
    if (!isbnNumber) return;

    this.isISBNEbookErifying.set(true);
    this.isbnEbookVerified.set(false);

    try {
      const result = await this.isbnService.verifyIsbn(isbnNumber);
      if (result.verified) {
        this.isbnEbookVerified.set(true);
        this.titleDetailsGroup().controls.isbnEbook.setErrors(null);
      } else {
        this.isbnEbookVerified.set(false);
        this.titleDetailsGroup().controls.isbnEbook.setErrors({
          invalidIsbn: true,
        });
      }
    } catch (err) {
      console.error('ISBN verification failed', err);
      this.isbnEbookVerified.set(false);
      this.titleDetailsGroup().controls.isbnEbook.setErrors({
        invalidIsbn: true,
      });
    } finally {
      this.isISBNEbookErifying.set(false);
    }
  }
}
