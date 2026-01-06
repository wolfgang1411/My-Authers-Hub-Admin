import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { BlogService } from '../../../services/blog';
import { Blog, BlogStatus, CreateBlog } from '../../../interfaces';
import { Logger } from '../../../services/logger';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../services/user';
import { User, UserAccessLevel } from '../../../interfaces';
import { AuthorsService } from '../../authors/authors-service';
import { PublisherService } from '../../publisher/publisher-service';
import { Author, AuthorStatus } from '../../../interfaces';
import { Publishers, Title, TitleFilter } from '../../../interfaces';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { TitleService } from '../../titles/title-service';

@Component({
  selector: 'app-blog-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    SharedModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    CKEditorModule,
    RouterModule,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './blog-form.html',
  styleUrl: './blog-form.css',
})
export class BlogForm implements OnInit, OnDestroy {
  blogService = inject(BlogService);
  logger = inject(Logger);
  router = inject(Router);
  route = inject(ActivatedRoute);
  translateService = inject(TranslateService);
  userService = inject(UserService);
  authorService = inject(AuthorsService);
  publisherService = inject(PublisherService);
  titleService = inject(TitleService);

  private destroy$ = new Subject<void>();

  blogId = signal<number | null>(null);
  currentBlogStatus = signal<BlogStatus | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  isSavingAsDraft = signal(false);
  isSavingAsArchive = signal(false);

  loggedInUser = computed(() => this.userService.loggedInUser$());
  isSuperAdmin = computed(() => {
    return this.loggedInUser()?.accessLevel === UserAccessLevel.SUPERADMIN;
  });

  // Author/Publisher selection for SUPERADMIN
  authorOptions = signal<{ label: string; value: number }[]>([]);
  publisherOptions = signal<{ label: string; value: number }[]>([]);
  isSearchingAuthors = signal(false);
  isSearchingPublishers = signal(false);
  authorSearchControl = new FormControl('');
  publisherSearchControl = new FormControl('');
  filteredAuthorOptions = signal<{ label: string; value: number }[]>([]);
  filteredPublisherOptions = signal<{ label: string; value: number }[]>([]);

  // Title selection
  titleOptions = signal<{ label: string; value: number }[]>([]);
  isSearchingTitles = signal(false);
  titleSearchControl = new FormControl('');
  filteredTitleOptions = signal<{ label: string; value: number }[]>([]);

  public Editor = ClassicEditor as any;
  public editorConfig: any = {
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'link',
        'bulletedList',
        'numberedList',
        '|',
        'blockQuote',
        'insertTable',
        '|',
        'undo',
        'redo',
      ],
    },
    language: 'en',
  };

  blogForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    subTitle: new FormControl(''), // Optional subtitle
    slug: new FormControl('', [Validators.required]),
    content: new FormControl('', [Validators.required]),
    authorId: new FormControl<number | null>(null), // For SUPERADMIN
    publisherId: new FormControl<number | null>(null), // For SUPERADMIN to filter authors
    titleIds: new FormControl<number[]>([]), // Array of title IDs
  });

  private isUpdatingFromEditor = false;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== '0') {
      this.blogId.set(+id);
      await this.loadBlog(+id);
    }

    // Setup search controls for SUPERADMIN
    if (this.isSuperAdmin()) {
      this.setupSearchControls();
      await this.loadAuthors();
      await this.loadPublishers();
    } else {
      // For non-SUPERADMIN, set authorId to logged-in user
      this.blogForm.controls.authorId.setValue(this.loggedInUser()?.id || null);
    }

    // Load titles for all users
    this.setupTitleSearchControl();
    await this.loadTitles();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSearchControls() {
    this.authorSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string | null) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.searchAuthors(searchTerm.trim());
        } else {
          this.filteredAuthorOptions.set(this.authorOptions());
        }
      });

    this.publisherSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string | null) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.searchPublishers(searchTerm.trim());
        } else {
          this.filteredPublisherOptions.set(this.publisherOptions());
        }
      });

    // Initialize filtered options
    this.filteredAuthorOptions.set(this.authorOptions());
    this.filteredPublisherOptions.set(this.publisherOptions());
  }

  setupTitleSearchControl() {
    this.titleSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string | null) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.searchTitles(searchTerm.trim());
        } else {
          this.filteredTitleOptions.set(this.titleOptions());
        }
      });

    // Initialize filtered options
    this.filteredTitleOptions.set(this.titleOptions());
  }

  async loadAuthors() {
    try {
      const { items } = await this.authorService.getAuthors({
        status: AuthorStatus.Active,
        itemsPerPage: 100,
      });
      this.authorOptions.set(
        items.map((author) => ({
          label: `${author.user?.firstName} ${author.user?.lastName} (${author.username})`,
          value: author.id, // Use author.id (Auther table ID), not user.id
        }))
      );
      this.filteredAuthorOptions.set(this.authorOptions());
    } catch (error) {
      this.logger.logError(error);
    }
  }

  async searchAuthors(searchTerm: string) {
    this.isSearchingAuthors.set(true);
    try {
      const { items } = await this.authorService.getAuthors({
        status: AuthorStatus.Active,
        searchStr: searchTerm,
        itemsPerPage: 100,
      });
      this.filteredAuthorOptions.set(
        items.map((author) => ({
          label: `${author.user?.firstName} ${author.user?.lastName} (${author.username})`,
          value: author.id, // Use author.id (Auther table ID), not user.id
        }))
      );
    } catch (error) {
      this.logger.logError(error);
    } finally {
      this.isSearchingAuthors.set(false);
    }
  }

  async loadPublishers() {
    try {
      const { items } = await this.publisherService.getPublishers({
        itemsPerPage: 100,
      });
      this.publisherOptions.set(
        items.map((publisher) => ({
          label: `${publisher.name} (${publisher.id})`,
          value: publisher.id, // Use publisher.id (Publisher table ID), not user.id
        }))
      );
      this.filteredPublisherOptions.set(this.publisherOptions());
    } catch (error) {
      this.logger.logError(error);
    }
  }

  async searchPublishers(searchTerm: string) {
    this.isSearchingPublishers.set(true);
    try {
      const { items } = await this.publisherService.getPublishers({
        searchStr: searchTerm,
        itemsPerPage: 100,
      });
      this.filteredPublisherOptions.set(
        items.map((publisher) => ({
          label: `${publisher.name} (${publisher.id})`,
          value: publisher.id, // Use publisher.id (Publisher table ID), not user.id
        }))
      );
    } catch (error) {
      this.logger.logError(error);
    } finally {
      this.isSearchingPublishers.set(false);
    }
  }

  async loadTitles() {
    try {
      const filter: TitleFilter = {
        itemsPerPage: 100,
      };
      const { items } = await this.titleService.getTitles(filter);
      this.titleOptions.set(
        items.map((title) => ({
          label: `${title.name}${title.subTitle ? ' - ' + title.subTitle : ''}`,
          value: title.id,
        }))
      );
      this.filteredTitleOptions.set(this.titleOptions());
    } catch (error) {
      this.logger.logError(error);
    }
  }

  async searchTitles(searchTerm: string) {
    this.isSearchingTitles.set(true);
    try {
      const filter: TitleFilter = {
        searchStr: searchTerm,
        itemsPerPage: 100,
      };
      const { items } = await this.titleService.getTitles(filter);
      this.filteredTitleOptions.set(
        items.map((title) => ({
          label: `${title.name}${title.subTitle ? ' - ' + title.subTitle : ''}`,
          value: title.id,
        }))
      );
    } catch (error) {
      this.logger.logError(error);
    } finally {
      this.isSearchingTitles.set(false);
    }
  }

  async loadBlog(id: number) {
    this.isLoading.set(true);
    try {
      const blog = await this.blogService.fetchBlog(id);
      this.currentBlogStatus.set(blog.status);
      // Extract title IDs from blog titles array
      const titleIds = blog.titles?.map((bt) => bt.titleId) || [];
      
      this.blogForm.patchValue({
        title: blog.title,
        subTitle: blog.subTitle || '',
        slug: blog.slug,
        content: blog.content,
        authorId: blog.authorId || null,
        publisherId: blog.publisherId || null,
        titleIds: titleIds,
      });
    } catch (error) {
      this.logger.logError(error);
      this.router.navigate(['/blogs']);
    } finally {
      this.isLoading.set(false);
    }
  }

  generateSlug() {
    const title = this.blogForm.controls.title.value || '';
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.blogForm.controls.slug.setValue(slug);
  }

  onEditorReady(editor: any): void {
    if (this.isUpdatingFromEditor) return;

    const content = this.blogForm.controls.content.value || '';
    if (editor.getData() !== content) {
      editor.setData(content);
    }
  }

  onEditorChange(event: any): void {
    if (this.isUpdatingFromEditor) return;

    this.isUpdatingFromEditor = true;
    const data = event.editor.getData();
    this.blogForm.controls.content.setValue(data);
    this.blogForm.controls.content.markAsTouched();
    setTimeout(() => {
      this.isUpdatingFromEditor = false;
    }, 100);
  }

  async saveBlog(status: BlogStatus) {
    if (this.blogForm.invalid) {
      this.blogForm.markAllAsTouched();
      return;
    }

    if (status === BlogStatus.DRAFT) {
      this.isSavingAsDraft.set(true);
    } else if (status === BlogStatus.ARCHIVED) {
      this.isSavingAsArchive.set(true);
    } else {
      this.isSaving.set(true);
    }

    try {
      const formValue = this.blogForm.value;
      const blogData: CreateBlog = {
        title: formValue.title!,
        subTitle: formValue.subTitle && formValue.subTitle.trim() ? formValue.subTitle.trim() : undefined,
        slug: formValue.slug!,
        content: formValue.content!,
        status: status,
        authorId: this.isSuperAdmin() ? formValue.authorId || undefined : undefined,
        publisherId: this.isSuperAdmin() ? formValue.publisherId || undefined : undefined,
        titleIds: formValue.titleIds && formValue.titleIds.length > 0 ? formValue.titleIds : undefined,
      };

      if (this.blogId()) {
        await this.blogService.updateBlog({
          id: this.blogId()!,
          ...blogData,
        });
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('Success'),
          text: this.translateService.instant('Blog updated successfully'),
        });
      } else {
        await this.blogService.createBlog(blogData);
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('Success'),
          text: this.translateService.instant('Blog created successfully'),
        });
      }

      this.router.navigate(['/blogs']);
    } catch (error) {
      this.logger.logError(error);
    } finally {
      this.isSaving.set(false);
      this.isSavingAsDraft.set(false);
      this.isSavingAsArchive.set(false);
    }
  }

  async saveAsDraft() {
    await this.saveBlog(BlogStatus.DRAFT);
  }

  async saveAndPublish() {
    await this.saveBlog(BlogStatus.PUBLISHED);
  }

  async saveAsArchive() {
    await this.saveBlog(BlogStatus.ARCHIVED);
  }

  isPublishedBlog(): boolean {
    return this.currentBlogStatus() === BlogStatus.PUBLISHED;
  }
}

