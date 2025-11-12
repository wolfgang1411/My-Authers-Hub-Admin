import { Component, effect, inject, Signal, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Author,
  createIsbn,
  ISBN,
  ISBNType,
  Publishers,
  Title,
} from '../../interfaces';
import { TitleService } from '../../pages/titles/title-service';
import { IsbnService } from '../../services/isbn-service';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import { LanguageService } from '../../services/languages';

@Component({
  standalone: true,
  selector: 'app-create-isbn',
  imports: [
    MatDialogContent,
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatDialogActions,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './create-isbn.html',
  styleUrl: './create-isbn.css',
})
export class CreateIsbn {
  constructor(
    private titleService: TitleService,
    private isbnService: IsbnService,
    private languageService: LanguageService
  ) {
    this.languages = this.languageService.languages$;
    effect(async () => {
      const { items: titles } = await this.titleService.getTitles();
      this.titleList.set(titles);
    });
  }

  languages!: Signal<string[] | null>;
  isSubmitted = signal(false);
  data = inject<Inputs>(MAT_DIALOG_DATA);
  titleList = signal<Title[] | null>(null);

  validateIsbn(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const isbn = control.value as string | null;
      if (!isbn || !isbn.length) return of(null);

      if (isbn.length !== 10 && isbn.length !== 13) {
        return of({ invalid: 'Invalid ISBN Number' });
      }

      // Quick length validation first
      if (isbn.length < 10 || (isbn.length > 10 && isbn.length < 13)) {
        return of({ invalid: 'Invalid ISBN Number' });
      }

      // ⏳ Debounce for 500ms before making API call
      return timer(500).pipe(
        switchMap(() => this.isbnService.verifyIsbn(isbn)),
        map(({ verified }) =>
          verified ? null : { invalid: 'Invalid ISBN Number' }
        ),
        catchError(() => of({ invalid: 'Invalid ISBN Number' }))
      );
    };
  }

  createIsbnForm = new FormGroup({
    isbnNumber: new FormControl<string | null>(null, {
      asyncValidators: [this.validateIsbn()],
    }),
    type: new FormControl<ISBNType | null>(null, [Validators.required]),
    titleName: new FormControl('', { validators: [Validators.required] }),
    authorIds: new FormControl([]),
    publisherId: new FormControl(),
    noOfPages: new FormControl<number | null>(null, [Validators.required]),
    language: new FormControl(''),
    mrp: new FormControl<number | null>(0, [Validators.required]),
    edition: new FormControl('', [Validators.required]),
  });

  ngOnInit() {
    this.languageService.fetchAndUpdateLanguages();
    if (this.data.isbn) {
      this.createIsbnForm.patchValue({
        ...this.data.isbn,
        authorIds: this.data.isbn.authors.map(({ id }) => id) as any,
      });
    }
  }
  async onSubmit() {
    this.isSubmitted.set(true);
    if (this.createIsbnForm.valid) {
      const {
        authorIds,
        edition,
        isbnNumber,
        language,
        mrp,
        noOfPages,
        publisherId,
        titleName,
        type,
      } = this.createIsbnForm.controls;
      this.data.onSubmit({
        authorIds: authorIds.value || [],
        publisherId: publisherId.value as number,
        edition: edition.value?.toString() as string,
        isbnNumber: isbnNumber.value as string,
        language: language.value as string,
        mrp: mrp.value as number,
        noOfPages: noOfPages.value as number,
        titleName: titleName.value as string,
        type: type.value as ISBNType,
      });
    }
  }
}
interface Inputs {
  isbn?: ISBN;
  authorsList: Author[];
  publishersList: Publishers[];
  onSubmit: (createIsbn: createIsbn) => void;
  onClose: () => void;
}
