import { Component, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import {
  Author,
  createIsbn,
  ISBN,
  Publishers,
  Title,
} from 'src/app/interfaces';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import { TitleService } from 'src/app/pages/titles/title-service';
import { IsbnService } from 'src/app/services/isbn-service';
import { IsbnFormat } from 'src/app/directives/isbn-format';
import { cleanIsbn, formatIsbn } from 'src/app/shared/utils/isbn.utils';

@Component({
  selector: 'app-assign-isbn',
  imports: [
    SharedModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    IsbnFormat,
  ],
  templateUrl: './assign-isbn.html',
  styleUrl: './assign-isbn.css',
})
export class AssignIsbn {
  constructor(
    private titleService: TitleService,
    private isbnService: IsbnService
  ) {}

  isSubmitted = signal(false);
  data = inject<Inputs>(MAT_DIALOG_DATA);

  validateIsbn(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      let isbn = cleanIsbn(control.value || '');

      if (isbn.length === 0) return of(null);

      // MUST be exactly 13
      if (isbn.length < 13) return of(null); // allow typing
      if (isbn.length !== 13) return of({ invalid: 'ISBN must be 13 digits' });

      // API verification
      return timer(500).pipe(
        switchMap(() => this.isbnService.verifyIsbn(isbn)),
        map(({ verified }) => (verified ? null : { invalid: 'Invalid ISBN' })),
        catchError(() => of({ invalid: 'Invalid ISBN' }))
      );
    };
  }

  createIsbnForm = new FormGroup({
    isbnNumber: new FormControl<string | null>(null, {
      asyncValidators: this.validateIsbn(),
    }),
  });

  ngOnInit() {
    if (this.data.isbn) {
      this.createIsbnForm.patchValue({
        isbnNumber: formatIsbn(this.data.isbn.isbnNumber),
      });
    }
  }
  async onSubmit() {
    this.isSubmitted.set(true);
    if (this.createIsbnForm.valid) {
      const isbn = cleanIsbn(this.createIsbnForm.value.isbnNumber as string);
      this.data.onSubmit({ isbnNumber: isbn });
      console.log(isbn, 'isbnnnnnnnnnn');
    }
  }
}
interface Inputs {
  isbn?: ISBN;
  authorsList: Author[];
  publishersList: Publishers[];
  onSubmit: (createIsbn: { isbnNumber: string }) => void;
  onClose: () => void;
}
