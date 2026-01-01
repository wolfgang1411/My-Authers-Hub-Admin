import { Component, effect, inject, OnDestroy, signal, WritableSignal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  Author,
  AuthorFilter,
  CreateRoyalty,
  PublisherFilter,
  Publishers,
  Title,
} from '../../interfaces';
import { TitleService } from '../../pages/titles/title-service';
import { MatIconModule } from '@angular/material/icon';
import { AuthorsService } from '../../pages/authors/authors-service';
import { PublisherService } from '../../pages/publisher/publisher-service';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-royalty',
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogTitle,
    MatIconModule,
    NgxMatSelectSearchModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './add-royalty.html',
  styleUrl: './add-royalty.css',
})
export class AddRoyalty implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  constructor(
    private titleService: TitleService,
    private authorService: AuthorsService,
    private publisherService: PublisherService
  ) {
    effect(async () => {
      const { items: titleList } = await this.titleService.getTitles();
      this.titleList.set(titleList);
      // Update all title options
      this.filteredTitleOptions.forEach((signal, index) => {
        this.updateTitleOptions(index);
      });
    });
  }
  
  private initializeSearchControlsForIndex(index: number) {
    // Create search controls for this index
    const titleSearchControl = new FormControl<string | null>('');
    const authorSearchControl = new FormControl<string | null>('');
    const publisherSearchControl = new FormControl<string | null>('');
    
    this.titleSearchControls.set(index, titleSearchControl);
    this.authorSearchControls.set(index, authorSearchControl);
    this.publisherSearchControls.set(index, publisherSearchControl);
    
    // Create filtered options signals
    this.filteredTitleOptions.set(index, signal<{ label: string; value: number }[]>([]));
    this.filteredAuthorOptions.set(index, signal<{ label: string; value: number }[]>([]));
    this.filteredPublisherOptions.set(index, signal<{ label: string; value: number }[]>([]));
    
    // Create loading signals
    this.isSearchingAuthors.set(index, signal(false));
    this.isSearchingPublishers.set(index, signal(false));
    
    // Setup subscriptions
    titleSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateTitleOptions(index);
      });
    
    authorSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.searchAuthors(searchTerm.trim(), index);
        } else {
          this.updateAuthorOptions(index);
        }
      });
    
    publisherSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.searchPublishers(searchTerm.trim(), index);
        } else {
          this.updatePublisherOptions(index);
        }
      });
    
    // Initialize options
    this.updateTitleOptions(index);
    this.updateAuthorOptions(index);
    this.updatePublisherOptions(index);
  }
  
  private cleanupSearchControlsForIndex(index: number) {
    this.titleSearchControls.delete(index);
    this.authorSearchControls.delete(index);
    this.publisherSearchControls.delete(index);
    this.filteredTitleOptions.delete(index);
    this.filteredAuthorOptions.delete(index);
    this.filteredPublisherOptions.delete(index);
    this.isSearchingAuthors.delete(index);
    this.isSearchingPublishers.delete(index);
  }
  
  data = inject<Inputs>(MAT_DIALOG_DATA);
  titleList = signal<Title[] | null>(null);
  authorList = signal<Author[] | null>(null);
  publisherList = signal<Publishers[] | null>(null);
  
  // Search controls - one set per form array item
  titleSearchControls = new Map<number, FormControl<string | null>>();
  authorSearchControls = new Map<number, FormControl<string | null>>();
  publisherSearchControls = new Map<number, FormControl<string | null>>();
  
  // Filtered options - one set per form array item (using WritableSignal for .set() method)
  filteredTitleOptions = new Map<number, WritableSignal<{ label: string; value: number }[]>>();
  filteredAuthorOptions = new Map<number, WritableSignal<{ label: string; value: number }[]>>();
  filteredPublisherOptions = new Map<number, WritableSignal<{ label: string; value: number }[]>>();
  
  isSearchingAuthors = new Map<number, WritableSignal<boolean>>();
  isSearchingPublishers = new Map<number, WritableSignal<boolean>>();
  
  private updateTitleOptions(index: number) {
    const titles = this.titleList();
    const signal = this.filteredTitleOptions.get(index);
    if (!signal) return;
    
    if (!titles) {
      signal.set([]);
      return;
    }
    
    const searchControl = this.titleSearchControls.get(index);
    const searchValue = (searchControl?.value || '').toLowerCase();
    const filtered = titles
      .filter((title) => title.name.toLowerCase().includes(searchValue))
      .map((title) => ({ label: title.name, value: title.id }));
    
    signal.set(filtered);
  }
  
  private updateAuthorOptions(index: number) {
    const authors = this.authorList();
    const signal = this.filteredAuthorOptions.get(index);
    if (!signal) return;
    
    if (!authors) {
      signal.set([]);
      return;
    }
    
    const searchControl = this.authorSearchControls.get(index);
    const searchValue = (searchControl?.value || '').toLowerCase();
    const filtered = authors
      .filter((author) => {
        const fullName = author.user?.fullName || 
          `${author.user?.firstName || ''} ${author.user?.lastName || ''}`;
        return fullName.toLowerCase().includes(searchValue);
      })
      .map((author) => ({
        label: `${author.user?.firstName || ''} ${author.user?.lastName || ''}`,
        value: author.id,
      }));
    
    signal.set(filtered);
  }
  
  private updatePublisherOptions(index: number) {
    const publishers = this.publisherList();
    const signal = this.filteredPublisherOptions.get(index);
    if (!signal) return;
    
    if (!publishers) {
      signal.set([]);
      return;
    }
    
    const searchControl = this.publisherSearchControls.get(index);
    const searchValue = (searchControl?.value || '').toLowerCase();
    const filtered = publishers
      .filter((publisher) => publisher.name.toLowerCase().includes(searchValue))
      .map((publisher) => ({ label: publisher.name, value: publisher.id }));
    
    signal.set(filtered);
  }
  
  private async searchAuthors(searchTerm: string, index: number) {
    const loadingSignal = this.isSearchingAuthors.get(index);
    const filteredSignal = this.filteredAuthorOptions.get(index);
    if (!loadingSignal || !filteredSignal) return;
    
    loadingSignal.set(true);
    try {
      const { items } = await this.authorService.getAuthors({ searchStr: searchTerm });
      const filtered = items
        .map((author) => ({
          label: `${author.user?.firstName || ''} ${author.user?.lastName || ''}`,
          value: author.id,
        }));
      filteredSignal.set(filtered);
    } catch (error) {
      console.error('Error searching authors:', error);
      this.updateAuthorOptions(index);
    } finally {
      loadingSignal.set(false);
    }
  }
  
  private async searchPublishers(searchTerm: string, index: number) {
    const loadingSignal = this.isSearchingPublishers.get(index);
    const filteredSignal = this.filteredPublisherOptions.get(index);
    if (!loadingSignal || !filteredSignal) return;
    
    loadingSignal.set(true);
    try {
      const { items } = await this.publisherService.getPublishers({ searchStr: searchTerm });
      const filtered = items
        .map((publisher) => ({ label: publisher.name, value: publisher.id }));
      filteredSignal.set(filtered);
    } catch (error) {
      console.error('Error searching publishers:', error);
      this.updatePublisherOptions(index);
    } finally {
      loadingSignal.set(false);
    }
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  authorOrPublisherRequired: ValidatorFn = (
    control: AbstractControl
  ): ValidationErrors | null => {
    const authorId = control.get('authorId')?.value;
    const publisherId = control.get('publisherId')?.value;
    if (!authorId && !publisherId) {
      return { authorOrPublisherRequired: true };
    }
    if (authorId && publisherId) {
      return { onlyOneAllowed: true };
    }
    return null;
  };

  addRoyaltyForm = new FormGroup({
    royalties: new FormArray([
      new FormGroup(
        {
          titleId: new FormControl<number | null>(null, [Validators.required]),
          authorId: new FormControl<number | null>(null),
          publisherId: new FormControl<number | null>(null),
          print_mah: new FormControl<number | null>(null, [
            Validators.required,
          ]),
          print_third_party: new FormControl<number | null>(null, [
            Validators.required,
          ]),
          prime: new FormControl<number | null>(null, [Validators.required]),
          ebook_mah: new FormControl<number | null>(null, [
            Validators.required,
          ]),
          ebook_third_party: new FormControl<number | null>(null, [
            Validators.required,
          ]),
        },
        { validators: this.authorOrPublisherRequired }
      ),
    ]),
  });
  async ngOnInit() {
    // Initialize search controls for existing form array items
    this.royaltiesArray.controls.forEach((_, index) => {
      this.initializeSearchControlsForIndex(index);
    });
  }

  get royaltiesArray(): FormArray {
    return this.addRoyaltyForm.get('royalties') as FormArray;
  }
  async getAuthorPublisherList(titleId: number) {
    const authorFilter: AuthorFilter = { titleId };
    const publisherFilter: PublisherFilter = {};

    const [{ items: authors }, { items: publishers }] = await Promise.all([
      this.authorService.getAuthors(authorFilter),
      this.publisherService.getPublishers(publisherFilter),
    ]);

    this.authorList.set(authors);
    this.publisherList.set(publishers);
    
    // Update options for all indices
    this.filteredAuthorOptions.forEach((_, index) => {
      this.updateAuthorOptions(index);
    });
    this.filteredPublisherOptions.forEach((_, index) => {
      this.updatePublisherOptions(index);
    });
  }

  addRoyalty() {
    const newRoyalty = new FormGroup(
      {
        titleId: new FormControl<number | null>(null, [Validators.required]),
        authorId: new FormControl<number | null>(null),
        publisherId: new FormControl<number | null>(null),
        print_mah: new FormControl<number | null>(null, [Validators.required]),
        print_third_party: new FormControl<number | null>(null, [
          Validators.required,
        ]),
        prime: new FormControl<number | null>(null, [Validators.required]),
        ebook_mah: new FormControl<number | null>(null, [Validators.required]),
        ebook_third_party: new FormControl<number | null>(null, [
          Validators.required,
        ]),
      },
      { validators: this.authorOrPublisherRequired }
    );

    const newIndex = this.royaltiesArray.length;
    this.royaltiesArray.push(newRoyalty);
    this.initializeSearchControlsForIndex(newIndex);
  }
  
  removeRoyalty(index: number) {
    this.royaltiesArray.removeAt(index);
    this.cleanupSearchControlsForIndex(index);
    
    // Reinitialize controls for remaining indices (shift indices)
    const currentControls = Array.from(this.titleSearchControls.keys()).sort();
    currentControls.forEach((oldIndex) => {
      if (oldIndex > index) {
        // Move controls from oldIndex to oldIndex - 1
        const titleControl = this.titleSearchControls.get(oldIndex);
        const authorControl = this.authorSearchControls.get(oldIndex);
        const publisherControl = this.publisherSearchControls.get(oldIndex);
        const titleOptions = this.filteredTitleOptions.get(oldIndex);
        const authorOptions = this.filteredAuthorOptions.get(oldIndex);
        const publisherOptions = this.filteredPublisherOptions.get(oldIndex);
        const authorLoading = this.isSearchingAuthors.get(oldIndex);
        const publisherLoading = this.isSearchingPublishers.get(oldIndex);
        
        if (titleControl) this.titleSearchControls.set(oldIndex - 1, titleControl);
        if (authorControl) this.authorSearchControls.set(oldIndex - 1, authorControl);
        if (publisherControl) this.publisherSearchControls.set(oldIndex - 1, publisherControl);
        if (titleOptions) this.filteredTitleOptions.set(oldIndex - 1, titleOptions);
        if (authorOptions) this.filteredAuthorOptions.set(oldIndex - 1, authorOptions);
        if (publisherOptions) this.filteredPublisherOptions.set(oldIndex - 1, publisherOptions);
        if (authorLoading) this.isSearchingAuthors.set(oldIndex - 1, authorLoading);
        if (publisherLoading) this.isSearchingPublishers.set(oldIndex - 1, publisherLoading);
        
        // Clean up old index
        this.cleanupSearchControlsForIndex(oldIndex);
      }
    });
  }
  onSubmit() {
    if (this.addRoyaltyForm.valid) {
      const addFormData = this.addRoyaltyForm.get('royalties')?.value;
      // this.data.onSubmit(addFormData as CreateRoyalty[]);
    }
  }
}
interface Inputs {
  onSubmit: (royaltiesArray: CreateRoyalty[]) => void;
  onClose: () => void;
}
