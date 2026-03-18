import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { format } from 'date-fns';
import {
  FormGroup,
  ReactiveFormsModule,
  FormControl,
  Validators,
  FormArray,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  startWith,
} from 'rxjs';
import Swal from 'sweetalert2';

import {
  TitleDetailsFormGroup,
  Author,
  Publishers,
  PublishingType,
  TitleCategory,
  TitleGenre,
  AuthorFormGroup,
  AuthorStatus,
  PublisherStatus,
  TitleStatus,
  TitleCreate,
} from '../../../../interfaces';
import { TitleService } from '../../../titles/title-service';
import { IsbnService } from '../../../../services/isbn-service';
import { LanguageService } from '../../../../services/languages';
import { AuthorsService } from '../../../authors/authors-service';
import { PublisherService } from '../../../publisher/publisher-service';
import { UserService } from '../../../../services/user';
import { IsbnFormatPipe } from '../../../../pipes/isbn-format-pipe';
import { cleanIsbn } from '../../../../shared/utils/isbn.utils';

@Component({
  selector: 'app-add-title-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatRadioModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    CKEditorModule,
    NgxMatSelectSearchModule,
  ],
  providers: [IsbnFormatPipe],
  templateUrl: './add-title-details.html',
  styleUrl: './add-title-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTitleDetails implements OnInit, OnDestroy {
  detailsGroup = input.required<FormGroup<TitleDetailsFormGroup>>();
  publishingType = input.required<PublishingType | null>();
  titleId = input<number | null>(null);

  saveComplete = output<{ id: number; isContinue: boolean }>();

  isLoading = signal(false);
  private readonly destroy$ = new Subject<void>();

  private readonly titleService = inject(TitleService);
  private readonly isbnService = inject(IsbnService);
  private readonly languageService = inject(LanguageService);
  private readonly authorService = inject(AuthorsService);
  private readonly publisherService = inject(PublisherService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly isbnFormatPipe = inject(IsbnFormatPipe);
  translateService = inject(TranslateService);

  loggedInUser = this.userService.loggedInUser$;

  public Editor = ClassicEditor as any;
  public editorConfig: any = {
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'bulletedList',
        'numberedList',
        '|',
        'outdent',
        'indent',
        '|',
        'blockQuote',
        'insertTable',
        '|',
        'link',
        '|',
        'undo',
        'redo',
      ],
      shouldNotGroupWhenFull: true,
    },
    heading: {
      options: [
        {
          model: 'paragraph',
          title: 'Paragraph',
          class: 'ck-heading_paragraph',
        },
        {
          model: 'heading1',
          view: 'h1',
          title: 'Heading 1',
          class: 'ck-heading_heading1',
        },
        {
          model: 'heading2',
          view: 'h2',
          title: 'Heading 2',
          class: 'ck-heading_heading2',
        },
        {
          model: 'heading3',
          view: 'h3',
          title: 'Heading 3',
          class: 'ck-heading_heading3',
        },
      ],
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
    },
    link: {
      decorators: {
        openInNewTab: {
          mode: 'manual',
          label: 'Open in a new tab',
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        },
      },
    },
    placeholder: 'Enter long description...',
  };
  // State Signals
  categories = signal<TitleCategory[]>([]);
  languages = signal<string[]>([]);
  subCategories = signal<TitleCategory[]>([]);
  genres = signal<TitleGenre[]>([]);
  tradeCategories = signal<TitleCategory[]>([]);

  // Search State
  authorSearchControl = new FormControl('');
  publisherSearchControl = new FormControl('');
  isSearchingAuthors = signal(false);
  isSearchingPublishers = signal(false);

  authorOptions = signal<{ label: string; value: number }[]>([]);
  publisherOptions = signal<{ label: string; value: number }[]>([]);
  filteredAuthorOptions = signal<{ label: string; value: number }[]>([]);
  filteredPublisherOptions = signal<{ label: string; value: number }[]>([]);

  // Verification State
  isbnVerified = signal<boolean | null>(null);
  isbnEbookVerified = signal<boolean | null>(null);
  isVerifying = signal(false);
  triedGenerateEbookIsbn = signal(false);

  PublishingType = PublishingType;

  constructor() {
    effect(() => {
      const search = (this.authorSearchControl.value || '').toLowerCase();
      const options = this.authorOptions();
      this.filteredAuthorOptions.set(
        options.filter((opt) => opt.label.toLowerCase().includes(search)),
      );
    });

    effect(() => {
      const search = (this.publisherSearchControl.value || '').toLowerCase();
      const options = this.publisherOptions();
      this.filteredPublisherOptions.set(
        options.filter((opt) => opt.label.toLowerCase().includes(search)),
      );
    });
  }

  async ngOnInit() {
    await this.loadInitialData();
    this.setupFormSubscriptions();
    if (this.detailsGroup().controls.isEbookIsbnAutoGenerated.value) {
      this.detailsGroup().controls.isbnEbook.disable();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadInitialData() {
    this.searchAuthors('');
    this.searchPublishers('');
    const [catsResp, genresResp, tradeResp, langsResp] = await Promise.all([
      this.titleService.getTitleCategory(),
      this.titleService.getGenre(),
      this.titleService.getTradeCategory(),
      this.languageService.fetchAndUpdateLanguages(),
    ]);

    this.categories.set(catsResp.items);
    this.genres.set(genresResp.items);
    this.tradeCategories.set(tradeResp.items);
    this.languages.set(this.languageService.languages$() || []);

    const catId = this.detailsGroup().controls.category.value;
    if (catId) {
      this.fetchSubcategories(Number(catId));
    }
  }

  setupFormSubscriptions() {
    this.detailsGroup().controls.category.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        if (val) {
          this.fetchSubcategories(Number(val));
          this.detailsGroup().controls.subCategory.enable();
        } else {
          this.subCategories.set([]);
          this.detailsGroup().controls.subCategory.disable();
          this.detailsGroup().controls.subCategory.reset();
        }
      });

    this.detailsGroup().valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.detailsGroup().controls.keywordOption.value === 'auto') {
          this.generateKeywords();
        }
      });

    this.authorSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((search) => {
        if (search && search.trim().length > 0) {
          this.searchAuthors(search.trim());
        }
      });

    this.publisherSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((search) => {
        if (search && search.trim().length > 0) {
          this.searchPublishers(search.trim());
        }
      });
  }

  async fetchSubcategories(catId: number) {
    const { items } = await this.titleService.getSubcategory(catId);
    this.subCategories.set(items);
  }

  async searchAuthors(term: string) {
    this.isSearchingAuthors.set(true);
    try {
      const { items } = await this.authorService.getAuthors({
        searchStr: term,
        status: AuthorStatus.Active,
      });
      this.authorOptions.set(
        items.map((a) => ({
          label: `${a.user?.firstName} ${a.user?.lastName} (${a.username})`,
          value: a.id,
        })),
      );
    } finally {
      this.isSearchingAuthors.set(false);
    }
  }

  async searchPublishers(term: string) {
    this.isSearchingPublishers.set(true);
    try {
      const { items } = await this.publisherService.getPublishers({
        searchStr: term,
        status: PublisherStatus.Active,
      });
      this.publisherOptions.set(
        items.map((p) => ({
          label: p.name,
          value: p.id,
        })),
      );
    } finally {
      this.isSearchingPublishers.set(false);
    }
  }

  get authorIdsArray() {
    return this.detailsGroup().controls.authorIds;
  }

  addAuthor() {
    const group = new FormGroup<AuthorFormGroup>({
      id: new FormControl<number | null>(null, Validators.required),
      name: new FormControl('', Validators.required),
      displayName: new FormControl('', Validators.required),
      keepSame: new FormControl(true, { nonNullable: true }),
      allowAuthorCopy: new FormControl(false, { nonNullable: true }),
    });
    this.authorIdsArray.push(group);
  }

  removeAuthor(index: number) {
    this.authorIdsArray.removeAt(index);
  }

  onAuthorSelected(authorId: number, index: number) {
    const author = this.authorOptions().find((a) => a.value === authorId);
    if (author) {
      const group = this.authorIdsArray.at(index);
      group.controls.name.setValue(author.label);
      if (group.controls.keepSame.value) {
        group.controls.displayName.setValue(author.label);
        group.controls.displayName.updateValueAndValidity();
      }
    }
  }

  onPublisherSelected(publisherId: number) {
    const publisher = this.publisherOptions().find(
      (p) => p.value === publisherId,
    );
    if (publisher) {
      const group = this.detailsGroup().controls.publisher;
      group.controls.name.setValue(publisher.label);
      if (group.controls.keepSame.value) {
        group.controls.displayName.setValue(publisher.label);
        this.detailsGroup().controls.publisherDisplay.setValue(publisher.label);
        group.controls.displayName.updateValueAndValidity();
      }
    }
  }

  onAuthorKeepSameChange(index: number, event: any) {
    const group = this.authorIdsArray.at(index);
    if (event.target.checked) {
      group.controls.displayName.setValue(group.controls.name.value);
      group.controls.displayName.updateValueAndValidity();
    }
  }

  onIsbnBlur(controlName: 'isbnPrint' | 'isbnEbook') {
    const control = this.detailsGroup().get(controlName);
    if (control?.value) {
      control.setValue(this.isbnFormatPipe.transform(control.value), {
        emitEvent: false,
      });
    }
  }

  async onClickGenerateEbookIsbn() {
    const isGenerated =
      this.detailsGroup().controls.isEbookIsbnAutoGenerated.value;

    if (isGenerated) {
      // Logic to cancel/clear
      this.detailsGroup().controls.isbnEbook.setValue(null);
      this.detailsGroup().controls.isbnEbook.enable();
      this.detailsGroup().controls.isEbookIsbnAutoGenerated.setValue(false);
      this.isbnEbookVerified.set(null);
      return;
    }

    const titleName = this.detailsGroup().controls.name.value;
    if (!titleName) {
      Swal.fire({
        icon: 'warning',
        title: 'Title Required',
        text: 'Please enter a title name first to generate an ISBN.',
      });
      return;
    }

    try {
      this.isVerifying.set(true);
      const response = await this.isbnService.generateEbookISBN(titleName!);
      if (response && response.code) {
        const formattedIsbn = this.isbnFormatPipe.transform(response.code);
        this.detailsGroup().controls.isbnEbook.setValue(formattedIsbn);
        this.detailsGroup().controls.isbnEbook.disable();
        this.detailsGroup().controls.isEbookIsbnAutoGenerated.setValue(true);
        this.isbnEbookVerified.set(true);
      }
    } catch (error) {
      console.error('Error generating Ebook ISBN:', error);
      Swal.fire({
        icon: 'error',
        title: 'Generation Failed',
        text: 'Failed to generate Ebook ISBN. Please try again or enter manually.',
      });
    } finally {
      this.isVerifying.set(false);
    }
  }

  generateKeywords() {
    const vals = this.detailsGroup().getRawValue();
    const authorsStr = this.authorIdsArray.controls
      .map((c: FormGroup<AuthorFormGroup>) => c.controls.displayName.value)
      .filter((v: string | null | undefined) => !!v)
      .join('; ');

    const catName =
      this.categories().find((c) => c.id === Number(vals.category))?.name || '';
    const subCatName =
      this.subCategories().find((c) => c.id === Number(vals.subCategory))
        ?.name || '';

    const keywords = [vals.name, authorsStr, catName, subCatName, vals.subject]
      .filter((v) => !!v)
      .join('; ');
    this.detailsGroup().controls.autoKeywords.setValue(keywords);
  }

  async onSaveTitleDetails() {
    const group = this.detailsGroup();
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }

    try {
      this.isLoading.set(true);
      const titleDetails = group.getRawValue();
      const publishingType = this.publishingType();

      const validAuthors = (titleDetails.authorIds || [])
        .filter((author: any) => !!author?.id)
        .map((author: any) => ({
          id: author.id,
          displayName: author.displayName || '',
          allowAuthorCopy: !!author.allowAuthorCopy,
        }));

      const basicData: TitleCreate = {
        publishingType: publishingType as PublishingType,
        isbnPrint: titleDetails.isbnPrint
          ? cleanIsbn(titleDetails.isbnPrint)
          : undefined,
        isbnEbook: titleDetails.isEbookIsbnAutoGenerated
          ? (titleDetails.isbnEbook ?? undefined)
          : (cleanIsbn(titleDetails.isbnEbook as string) ?? undefined),
        isEbookIsbnAutoGenerated: !!titleDetails.isEbookIsbnAutoGenerated,
        categoryId: titleDetails.category as number,
        subCategoryId: titleDetails.subCategory as number,
        tradeCategoryId: titleDetails.tradeCategory as number,
        genreId: titleDetails.genre as number,
        publisherDisplay:
          this.loggedInUser()?.accessLevel === 'PUBLISHER'
            ? this.loggedInUser()?.publisher?.name
            : (titleDetails.publisher?.displayName as string),
        publisherId:
          this.loggedInUser()?.accessLevel === 'PUBLISHER'
            ? this.loggedInUser()?.publisher?.id
            : (titleDetails.publisher?.id as number),
        name: titleDetails.name as string,
        subTitle: titleDetails.subTitle as string,
        subject: titleDetails.subject as string,
        language: titleDetails.language,
        longDescription: titleDetails.longDescription,
        edition: titleDetails.edition,
        keywords: titleDetails.autoKeywords || titleDetails.manualKeywords,
        printingOnly: (this.route.snapshot.queryParams as any).printingFormat === 'printOnly', // fallback or handle via prop
        isUniqueIdentifier: false,
        launch_date: (() => {
          const dateVal = titleDetails.launch_date;
          if (!dateVal) return undefined;
          const d = new Date(dateVal);
          return isNaN(d.getTime()) ? undefined : format(d, 'yyyy-MM-dd');
        })(),
        ...(validAuthors.length > 0 && { authorIds: validAuthors }),
        id: this.titleId() || undefined,
      } as TitleCreate;

      // Special case: Approved Title + Publisher -> Update Ticket
      if (
        this.titleId() &&
        group.controls.status.value === TitleStatus.APPROVED &&
        this.loggedInUser()?.accessLevel === 'PUBLISHER'
      ) {
        await this.titleService.createTitleUpdateTicket(
          this.titleId()!,
          basicData,
        );
        Swal.fire({
          icon: 'success',
          title: 'Request Sent',
          text: 'Request has been sent to superadmin for approval.',
        });
        this.saveComplete.emit({ id: this.titleId()!, isContinue: false });
        return;
      }

      const res = await this.titleService.createTitle(basicData);
      if (res?.id) {
        const newId = Number(res.id);
        this.saveComplete.emit({ id: newId, isContinue: true });
      }
    } catch (error) {
      console.error('Error saving title details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: 'An error occurred while saving title details.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
