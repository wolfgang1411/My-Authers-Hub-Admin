import {
  Component,
  effect,
  inject,
  OnDestroy,
  Signal,
  signal,
} from '@angular/core';
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
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthorsService } from '../../pages/authors/authors-service';
import { PublisherService } from '../../pages/publisher/publisher-service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

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
    NgxMatSelectSearchModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './create-isbn.html',
  styleUrl: './create-isbn.css',
})
export class CreateIsbn implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private titleService: TitleService,
    private isbnService: IsbnService,
    private languageService: LanguageService,
    private publisherService: PublisherService,
  ) {
    this.languages = this.languageService.languages$;
    effect(async () => {
      const { items: titles } = await this.titleService.getTitles();
      this.titleList.set(titles);
      this.updatePublisherOptions();
    });

    // Setup search controls
    this.publisherSearchControl = new FormControl('');

    // Setup search subscriptions
    this.setupSearchSubscriptions();
  }

  languages!: Signal<string[] | null>;
  isSubmitted = signal(false);
  data = inject<Inputs>(MAT_DIALOG_DATA);
  titleList = signal<Title[] | null>(null);

  // Search controls
  publisherSearchControl = new FormControl('');

  // Filtered options
  filteredPublisherOptions = signal<{ label: string; value: number }[]>([]);

  isSearchingPublishers = signal(false);

  private setupSearchSubscriptions() {
    // Publisher search
    this.publisherSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.searchPublishers(searchTerm.trim());
        } else {
          this.updatePublisherOptions();
        }
      });
  }

  private updatePublisherOptions() {
    const publishers = this.data.publishersList || [];
    const searchValue = (this.publisherSearchControl.value || '').toLowerCase();
    const filtered = publishers
      .filter((publisher) => publisher.name.toLowerCase().includes(searchValue))
      .map((publisher) => ({ label: publisher.name, value: publisher.id }));
    this.filteredPublisherOptions.set(filtered);
  }

  private async searchPublishers(searchTerm: string) {
    this.isSearchingPublishers.set(true);
    try {
      const { items } = await this.publisherService.getPublishers({
        searchStr: searchTerm,
      });
      const filtered = items.map((publisher) => ({
        label: publisher.name,
        value: publisher.id,
      }));
      this.filteredPublisherOptions.set(filtered);
    } catch (error) {
      console.error('Error searching publishers:', error);
      this.updatePublisherOptions();
    } finally {
      this.isSearchingPublishers.set(false);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
      const titleName = this.createIsbnForm.controls.titleName.value || '';
      return timer(500).pipe(
        switchMap(() => this.isbnService.verifyIsbn(isbn, titleName)),
        map(({ verified }) =>
          verified ? null : { invalid: 'Invalid ISBN Number' },
        ),
        catchError(() => of({ invalid: 'Invalid ISBN Number' })),
      );
    };
  }

  createIsbnForm = new FormGroup({
    isbnNumber: new FormControl<string | null>(null),
    type: new FormControl<ISBNType | null>(null, [Validators.required]),
    titleName: new FormControl('', { validators: [Validators.required] }),
    authorName: new FormControl('', {
      validators: [Validators.required],
    }),
    publisherId: new FormControl(),
    noOfPages: new FormControl<number | null>(null, [Validators.required]),
    language: new FormControl(''),
    mrp: new FormControl<number | null>(0, [Validators.required]),
    edition: new FormControl('', [Validators.required]),
  });

  async ngOnInit() {
    await this.languageService.fetchAndUpdateLanguages();
    if (this.data.isbn) {
      this.createIsbnForm.patchValue({
        ...this.data.isbn,
        // authorIds: this.data.isbn.authors.map(({ id }) => id) as any,
      });
    }
  }
  async onSubmit() {
    this.isSubmitted.set(true);
    if (this.createIsbnForm.valid) {
      const {
        authorName,
        edition,
        language,
        mrp,
        noOfPages,
        publisherId,
        titleName,
        type,
      } = this.createIsbnForm.controls;
      this.data.onSubmit({
        authorName: authorName.value as string,
        publisherId: publisherId.value as number,
        edition: edition.value?.toString() as string,
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
