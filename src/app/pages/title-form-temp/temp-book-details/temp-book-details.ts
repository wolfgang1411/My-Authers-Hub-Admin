import {
  Component,
  effect,
  EventEmitter,
  inject,
  input,
  Input,
  OnDestroy,
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
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TitleService } from '../../titles/title-service';
import {
  Author,
  AuthorFormGroup,
  AuthorStatus,
  Publishers,
  PublisherStatus,
  PublishingType,
  TitleCategory,
  TitleDetailsFormGroup,
  TitleGenre,
  User,
} from '../../../interfaces';
import { MatRadioModule } from '@angular/material/radio';
import { debounceTime, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { IsbnService } from '../../../services/isbn-service';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { LanguageService } from '../../../services/languages';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { formatIsbn13 } from '../../../common/utils/isbn';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { IsbnFormatPipe } from 'src/app/pipes/isbn-format-pipe';
import { AuthorsService } from '../../authors/authors-service';
import { PublisherService } from '../../publisher/publisher-service';
import {
  SearchableSelect,
  SearchableSelectOption,
} from '../../../components/searchable-select/searchable-select';

@Component({
  selector: 'app-temp-book-details',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    SharedModule,
    MatSelectModule,
    MatInputModule,
    MatAutocompleteModule,
    MatRadioModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    CKEditorModule,
    MatDatepickerModule,
    SearchableSelect,
  ],
  providers: [IsbnFormatPipe],
  templateUrl: './temp-book-details.html',
  styleUrl: './temp-book-details.css',
})
export class TempBookDetails implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // Searchable select options
  authorOptions = signal<SearchableSelectOption[]>([]);
  publisherOptions = signal<SearchableSelectOption[]>([]);
  isSearchingAuthors = signal(false);
  isSearchingPublishers = signal(false);

  constructor(
    private titleService: TitleService,
    private isbnService: IsbnService,
    private languageService: LanguageService,
    private isbnFormatPipe: IsbnFormatPipe,
    private authorService: AuthorsService,
    private publisherService: PublisherService
  ) {
    this.languages = this.languageService.languages$;

    effect(() => {
      if (this.initialized()) return; // already executed once
      const publishers = this.publishers();
      const loggedInUserPublisher = this.loggedInUser()?.publisher;

      if (publishers && publishers.length && loggedInUserPublisher) {
        this.titleDetailsGroup().controls.publisher.controls.id.patchValue(
          loggedInUserPublisher.id
        );
        this.onPublisherChange(loggedInUserPublisher.id);
        this.initialized.set(true); // mark as done
      }
    });

    // Set default language to first language when languages are loaded
    effect(() => {
      const languages = this.languages();
      const languageControl = this.titleDetailsGroup().controls.language;

      if (languages && languages.length > 0 && !languageControl.value) {
        languageControl.setValue(languages[0]);
      }
    });

    // Convert authors to options format - MUST be in constructor for reactivity
    effect(() => {
      const authors = this.authorsList();
      this.authorOptions.set(
        authors.map((author) => ({
          label: `${author.user?.firstName} ${author.user?.lastName} (${author.username}) (${author.id})`,
          value: author.id,
        }))
      );
    });

    // Convert publishers to options format - MUST be in constructor for reactivity
    effect(() => {
      const publishers = this.publishers();
      this.publisherOptions.set(
        publishers.map((publisher) => ({
          label: publisher.name,
          value: publisher.id,
        }))
      );
    });
  }
  private initialized = signal(false);

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

  loggedInUser = input<User | null>();

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
  triedGenerateEbookIsbn = false;
  languages!: Signal<string[] | null>;

  async ngOnInit() {
    await this.languageService.fetchAndUpdateLanguages();
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

    this.titleDetailsGroup()
      .controls.category.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const subCategoryControl =
          this.titleDetailsGroup().controls.subCategory;
        if (value) {
          subCategoryControl.enable();
        } else {
          subCategoryControl.disable();
          subCategoryControl.reset();
        }
      });

    this.titleDetailsGroup()
      .valueChanges.pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.titleDetailsGroup().controls.keywordOption.value === 'auto') {
          this.generateKeywordsAutomatically();
        }
      });
    this.titleDetailsGroup().controls.name.valueChanges.subscribe(() => {
      this.triedGenerateEbookIsbn = false;
    });
  }

  onAuthorSearch(searchTerm: string, index: number) {
    // Call API for any search term (no minimum limit)
    if (searchTerm && searchTerm.trim().length > 0) {
      this.searchAuthors(searchTerm.trim(), index);
    }
  }

  onPublisherSearch(searchTerm: string) {
    // Call API for any search term (no minimum limit)
    if (searchTerm && searchTerm.trim().length > 0) {
      this.searchPublishers(searchTerm.trim());
    }
  }

  onAuthorSelected(authorId: number | null | undefined, index: number) {
    // Guard against null/undefined authorId to prevent API calls with null
    if (authorId == null || authorId === undefined) {
      return;
    }

    const authorCtrl = this.titleDetailsGroup().controls.authorIds.at(
      index
    ) as FormGroup<AuthorFormGroup>;
    if (!authorCtrl) return;

    authorCtrl.controls.id.setValue(authorId);

    // Call onAuthorChange - it will handle finding the author
    // If author is not in authorsList, onAuthorChange will fetch it
    this.onAuthorChange(index, authorId);
    this.onAuthorChangeChild.emit(authorId);
  }

  onPublisherSelected(publisherId: number) {
    const pubGroup = this.titleDetailsGroup().controls.publisher;
    if (!pubGroup) return;
    pubGroup.controls.id.setValue(publisherId);
    this.onPublisherChange(publisherId);
    this.onPublisherChangeChild.emit(publisherId);
  }

  async searchAuthors(searchTerm: string, authorIndex?: number) {
    try {
      this.isSearchingAuthors.set(true);

      // Always include currently selected authors to ensure they're visible
      const currentAuthorIds = this.titleDetailsGroup()
        .controls.authorIds.controls.map((ctrl) => ctrl.controls.id.value)
        .filter((id): id is number => id != null && !isNaN(Number(id)));

      // Get currently selected authors from the full list
      let selectedAuthors = this.authorsList().filter((a) =>
        currentAuthorIds.includes(a.id)
      );

      // For any selected author IDs not in authorsList, fetch them
      const missingAuthorIds = currentAuthorIds.filter(
        (id) => !selectedAuthors.find((a) => a.id === id)
      );
      if (missingAuthorIds.length > 0) {
        const fetchedAuthors = await Promise.all(
          missingAuthorIds.map((id) =>
            this.authorService.getAuthorrById(id).catch(() => null)
          )
        );
        const validFetchedAuthors = fetchedAuthors.filter(
          (a): a is Author => a != null
        );
        selectedAuthors = [...selectedAuthors, ...validFetchedAuthors];
      }

      // Do server-side search
      const { items } = await this.authorService.getAuthors({
        status: AuthorStatus.Active,
        searchStr: searchTerm,
        itemsPerPage: 100,
      });

      // Combine search results with selected authors, removing duplicates
      // Always put selected authors first to ensure they're visible
      const combined = [...selectedAuthors];
      items.forEach((author) => {
        if (!combined.find((a) => a.id === author.id)) {
          combined.push(author);
        }
      });

      // Update options - always include selected values
      this.authorOptions.set(
        combined.map((author) => ({
          label: `${author.user?.firstName} ${author.user?.lastName} (${author.username}) (${author.id})`,
          value: author.id,
        }))
      );
    } catch (error) {
      console.error('Error searching authors:', error);
      // On error, ensure selected authors are still in the list
      const currentAuthorIds = this.titleDetailsGroup()
        .controls.authorIds.controls.map((ctrl) => ctrl.controls.id.value)
        .filter((id): id is number => id != null && !isNaN(Number(id)));

      let selectedAuthors = this.authorsList().filter((a) =>
        currentAuthorIds.includes(a.id)
      );

      // Try to fetch missing authors
      const missingAuthorIds = currentAuthorIds.filter(
        (id) => !selectedAuthors.find((a) => a.id === id)
      );
      if (missingAuthorIds.length > 0) {
        const fetchedAuthors = await Promise.all(
          missingAuthorIds.map((id) =>
            this.authorService.getAuthorrById(id).catch(() => null)
          )
        );
        const validFetchedAuthors = fetchedAuthors.filter(
          (a): a is Author => a != null
        );
        selectedAuthors = [...selectedAuthors, ...validFetchedAuthors];
      }

      // Fall back to all authors + selected authors
      const allAuthors = this.authorsList();
      const combined = [...selectedAuthors];
      allAuthors.forEach((author) => {
        if (!combined.find((a) => a.id === author.id)) {
          combined.push(author);
        }
      });

      this.authorOptions.set(
        combined.map((author) => ({
          label: `${author.user?.firstName} ${author.user?.lastName} (${author.username}) (${author.id})`,
          value: author.id,
        }))
      );
    } finally {
      this.isSearchingAuthors.set(false);
    }
  }

  async searchPublishers(searchTerm: string) {
    try {
      this.isSearchingPublishers.set(true);

      // Always include currently selected publisher to ensure it's visible
      const currentPublisherId =
        this.titleDetailsGroup().controls.publisher.controls.id.value;

      // Get currently selected publisher from the full list
      let selectedPublisher = currentPublisherId
        ? this.publishers().find((p) => p.id === currentPublisherId)
        : null;

      // If publisher not in list, fetch it
      if (currentPublisherId && !selectedPublisher) {
        try {
          selectedPublisher = await this.publisherService.getPublisherById(
            currentPublisherId
          );
        } catch (error) {
          console.error('Error fetching publisher:', error);
        }
      }

      // Do server-side search
      const { items } = await this.publisherService.getPublishers({
        status: PublisherStatus.Active,
        searchStr: searchTerm,
        itemsPerPage: 100,
      });

      // Combine search results with selected publisher, removing duplicates
      // Always put selected publisher first
      const combined = selectedPublisher ? [selectedPublisher] : [];
      items.forEach((publisher) => {
        if (!combined.find((p) => p.id === publisher.id)) {
          combined.push(publisher);
        }
      });

      // Update options - always include selected value
      this.publisherOptions.set(
        combined.map((publisher) => ({
          label: publisher.name,
          value: publisher.id,
        }))
      );
    } catch (error) {
      console.error('Error searching publishers:', error);
      // On error, ensure selected publisher is still in the list
      const currentPublisherId =
        this.titleDetailsGroup().controls.publisher.controls.id.value;

      let selectedPublisher = currentPublisherId
        ? this.publishers().find((p) => p.id === currentPublisherId)
        : null;

      // Try to fetch if not in list
      if (currentPublisherId && !selectedPublisher) {
        try {
          selectedPublisher = await this.publisherService.getPublisherById(
            currentPublisherId
          );
        } catch (error) {
          console.error('Error fetching publisher:', error);
        }
      }

      // Fall back to all publishers + selected publisher
      const allPublishers = this.publishers();
      const combined = selectedPublisher ? [selectedPublisher] : [];
      allPublishers.forEach((publisher) => {
        if (!combined.find((p) => p.id === publisher.id)) {
          combined.push(publisher);
        }
      });

      this.publisherOptions.set(
        combined.map((publisher) => ({
          label: publisher.name,
          value: publisher.id,
        }))
      );
    } finally {
      this.isSearchingPublishers.set(false);
    }
  }
  onIsbnBlur(controlName: 'isbnPrint' | 'isbnEbook') {
    const control = this.titleDetailsGroup().get(controlName);
    if (!control?.value) return;

    const formatted = this.isbnFormatPipe.transform(control.value);
    control.setValue(formatted, { emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  onAuthorChange(index: number, authorId: number | null | undefined) {
    // Guard against null/undefined authorId
    if (authorId == null || authorId === undefined) {
      return;
    }

    const authorCtrl = this.titleDetailsGroup().controls.authorIds.at(
      index
    ) as FormGroup<AuthorFormGroup>;
    if (!authorCtrl) return;

    // Try to find author in authorsList first
    let selected = this.authorsList().find((a) => a.id === authorId);

    // If not found, try to get it from the search results
    // We need to fetch it since authorOptions only has label/value, not full author object
    if (!selected) {
      // Only fetch if authorId is valid (not null/undefined)
      if (authorId != null && !isNaN(Number(authorId))) {
        // Fetch the author by ID
        this.authorService
          .getAuthorrById(authorId)
          .then((fetchedAuthor) => {
            if (fetchedAuthor) {
              const keepSame = authorCtrl.controls.keepSame.value ?? true; // Default to true if not set
              // Always set display name if keepSame is true (default behavior, like publisher)
              if (keepSame) {
                const displayName = `${fetchedAuthor.user?.firstName} ${fetchedAuthor.user?.lastName}(${fetchedAuthor.username})`;
                authorCtrl.controls.displayName.setValue(displayName);
              }
            }
          })
          .catch(() => {
            // If fetch fails, try to construct display name from the option label
            const option = this.authorOptions().find(
              (opt) => opt.value === authorId
            );
            if (option) {
              // Extract name from label format: "FirstName LastName (username) (id)"
              const match = option.label.match(
                /^(.+?)\s*\(([^)]+)\)\s*\((\d+)\)$/
              );
              if (match) {
                const keepSame = authorCtrl.controls.keepSame.value ?? true; // Default to true if not set
                if (keepSame) {
                  const displayName = `${match[1]}(${match[2]})`;
                  authorCtrl.controls.displayName.setValue(displayName);
                }
              }
            }
          });
      }
      return; // Exit early, will set display name in promise
    }

    const keepSame = authorCtrl.controls.keepSame.value ?? true; // Default to true if not set
    // Always set display name if keepSame is true (default behavior, like publisher)
    if (keepSame && selected) {
      const displayName = `${selected.user?.firstName} ${selected.user?.lastName}(${selected.username})`;
      authorCtrl.controls.displayName.setValue(displayName);
    }
  }

  getAuthorDisplayName(authorId: number | null | undefined): string {
    if (!authorId) return '';
    const author = this.authorsList().find((a: Author) => a.id === authorId);
    if (!author) return '';
    return `${author.user?.firstName} ${author.user?.lastName} (${author.username})`;
  }

  getPublisherDisplayName(publisherId: number | null | undefined): string {
    if (!publisherId) return '';
    const publisher = this.publishers().find(
      (p: Publishers) => p.id === publisherId
    );
    return publisher?.name || '';
  }

  addAuthor(): void {
    this.titleDetailsGroup().controls.authorIds.push(
      new FormGroup({
        id: new FormControl<number | null | undefined>(null),
        name: new FormControl<string | null>(null),
        keepSame: new FormControl<boolean>(true),
        displayName: new FormControl<string | null>(null),
        allowAuthorCopy: new FormControl<boolean | null | undefined>(false),
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
      const titleName = this.titleDetailsGroup().controls.name.value || '';
      const result = await this.isbnService.verifyIsbn(isbnNumber, titleName);
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
      const titleName = this.titleDetailsGroup().controls.name.value || '';
      const result = await this.isbnService.verifyIsbn(isbnNumber, titleName);
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

  async onClickGenerateEbookIsbn() {
    console.log('onClickGenerateEbookIsbn');

    this.triedGenerateEbookIsbn = true; // 👈 user tried to generate

    const titleCtrl = this.titleDetailsGroup().controls.name;
    const titleName = titleCtrl.value?.trim();

    if (!titleName || titleName.length < 4) {
      return;
    }

    // ✅ Title is fine → proceed
    this.titleDetailsGroup().controls.isEbookIsbnAutoGenerated.setValue(true);
    const { code } = await this.isbnService.generateEbookISBN(titleName);
    // formatIsbn13 will preserve BCBL codes as-is, so safe to call it
    const formattedIsbn = formatIsbn13(code) || code;
    this.titleDetailsGroup().controls.isbnEbook.setValue(formattedIsbn);
    this.titleDetailsGroup().controls.isbnEbook.disable();
  }

  onClickTypeEbookIsbn() {
    this.titleDetailsGroup().controls.isEbookIsbnAutoGenerated.setValue(false);
    this.titleDetailsGroup().controls.isbnEbook.setValue(null);
    this.titleDetailsGroup().controls.isbnEbook.enable();
  }

  private editorInstance: any = null;
  private isUpdatingFromEditor = false;
  private isUpdatingFromForm = false;

  onEditorReady(editor: any): void {
    this.editorInstance = editor;

    // Set initial value from form control if it exists
    const initialValue =
      this.titleDetailsGroup().controls.longDescription.value || '';
    if (initialValue && editor) {
      editor.setData(initialValue);
    }

    // Listen to editor changes and update form control
    editor.model.document.on('change:data', () => {
      if (this.isUpdatingFromForm) return;

      this.isUpdatingFromEditor = true;
      const data = editor.getData();
      const currentFormValue =
        this.titleDetailsGroup().controls.longDescription.value || '';

      // Only update if different to avoid circular updates
      if (data !== currentFormValue) {
        this.titleDetailsGroup().controls.longDescription.setValue(data, {
          emitEvent: false,
        });
        this.titleDetailsGroup().controls.longDescription.markAsTouched();
      }

      // Use setTimeout to reset the flag after Angular's change detection
      setTimeout(() => {
        this.isUpdatingFromEditor = false;
      }, 0);
    });

    // Subscribe to form control value changes to update editor only when changed externally
    this.titleDetailsGroup()
      .controls.longDescription.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((newValue) => {
        if (this.isUpdatingFromEditor) return;

        const editorData = editor.getData();
        const formValue = newValue || '';

        // Only update editor if the value is different (external change)
        if (editorData !== formValue) {
          this.isUpdatingFromForm = true;
          editor.setData(formValue);
          setTimeout(() => {
            this.isUpdatingFromForm = false;
          }, 0);
        }
      });
  }

  onEditorChange(event: any): void {
    if (this.isUpdatingFromForm) return;

    this.isUpdatingFromEditor = true;
    const data = event.editor.getData();
    const currentFormValue =
      this.titleDetailsGroup().controls.longDescription.value || '';

    // Only update if different to avoid unnecessary updates
    if (data !== currentFormValue) {
      this.titleDetailsGroup().controls.longDescription.setValue(data, {
        emitEvent: false,
      });
      this.titleDetailsGroup().controls.longDescription.markAsTouched();
    }

    setTimeout(() => {
      this.isUpdatingFromEditor = false;
    }, 0);
  }
}
