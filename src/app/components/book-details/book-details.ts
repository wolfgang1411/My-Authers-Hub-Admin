import { Component, Input, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TitleService } from '../../pages/titles/title-service';
import { TitleCategory, TitleGenre } from '../../interfaces';
import { sign } from 'crypto';
import { MatRadioModule } from '@angular/material/radio';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-book-details',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    SharedModule,
    MatSelectModule,
    MatInputModule,
    MatRadioModule,
  ],
  templateUrl: './book-details.html',
  styleUrl: './book-details.css',
})
export class BookDetails {
  constructor(private titleService: TitleService) {}
  @Input() titleForm!: FormGroup;
  TitleCategory = signal<TitleCategory[]>([]);
  subCategory = signal<TitleCategory[]>([]);
  tradeCategory = signal<TitleCategory[]>([]);
  TitleGenre = signal<TitleGenre[]>([]);

  async ngOnInit() {
    const { items: category } = await this.titleService.getTitleCategory();
    this.TitleCategory.set(category);
    const { items: genre } = await this.titleService.getGenre();
    this.TitleGenre.set(genre);
    const { items: trade } = await this.titleService.getTradeCategory();
    this.tradeCategory.set(trade);
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
      'titleDetails.authors'
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
}
