import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { BlogService } from '../../services/blog';
import { Blog, BlogFilter, BlogStatus } from '../../interfaces';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from '../../services/user';
import { User, UserAccessLevel } from '../../interfaces';
import { Logger } from '../../services/logger';

@Component({
  selector: 'app-blogs',
  imports: [
    SharedModule,
    ListTable,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './blogs.html',
  styleUrl: './blogs.css',
})
export class Blogs implements OnInit {
  matDialog = inject(MatDialog);
  blogService = inject(BlogService);
  translateService = inject(TranslateService);
  logger = inject(Logger);
  router = inject(Router);
  userService = inject(UserService);

  loggedInUser = computed(() => this.userService.loggedInUser$());
  isSuperAdmin = computed(() => {
    return this.loggedInUser()?.accessLevel === UserAccessLevel.SUPERADMIN;
  });

  dataSource = new MatTableDataSource<any>();
  lastPage = signal(1);

  filter = signal<BlogFilter>({
    itemsPerPage: 30,
    page: 1,
    orderBy: 'createdAt',
    orderByVal: 'desc',
  });
  blogs = signal<Blog[] | null>(null);

  // Cache to store fetched pages
  private pageCache = new Map<number, Blog[]>();
  private cachedFilterKey = '';

  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      itemsPerPage: currentFilter.itemsPerPage,
      orderBy: currentFilter.orderBy,
      orderByVal: currentFilter.orderByVal,
      search: currentFilter.search,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  displayedColumns: string[] = [
    'title',
    'status',
    'author',
    'publishedAt',
    'createdAt',
    'actions',
  ];

  isSortable = (column: string): boolean => {
    return ['title', 'status', 'publishedAt', 'createdAt'].includes(column);
  };

  async ngOnInit() {
    await this.fetchAndUpdateBlogs();
  }

  mapBlogsToDataSource() {
    const blogs = this.blogs();
    if (blogs) {
      this.dataSource.data = blogs.map((blog) => ({
        ...blog,
        title: blog.title,
        status: blog.status,
        author: blog.author?.fullName || 'Unknown',
        publishedAt: blog.publishedAt
          ? new Date(blog.publishedAt).toLocaleDateString()
          : '-',
        createdAt: new Date(blog.createdAt).toLocaleDateString(),
        actions: blog, // Pass the full blog object
      }));
    } else {
      this.dataSource.data = [];
    }
  }

  async fetchAndUpdateBlogs() {
    try {
      const currentFilter = this.filter();
      const currentPage = currentFilter.page || 1;
      const filterKey = this.getFilterKey();

      // Clear cache if filter changed
      if (this.cachedFilterKey !== filterKey) {
        this.clearCache();
        this.cachedFilterKey = filterKey;
      }

      // Check if page is already cached
      if (this.pageCache.has(currentPage)) {
        const cachedBlogs = this.pageCache.get(currentPage)!;
        this.blogs.set(cachedBlogs);
        this.mapBlogsToDataSource();
        return;
      }

      // Fetch from API (backend handles access level logic)
      const {
        items,
        itemsPerPage: returnedItemsPerPage,
        totalCount,
      } = await this.blogService.fetchBlogs(currentFilter);

      // Cache the fetched page
      this.pageCache.set(currentPage, items);
      this.blogs.set(items);
      this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
      this.mapBlogsToDataSource();
    } catch (error) {
      this.logger.logError(error);
    }
  }

  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchAndUpdateBlogs();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchAndUpdateBlogs();
    }
  }

  goToPage(page: number) {
    this.filter.update((f) => ({ ...f, page }));
    this.fetchAndUpdateBlogs();
  }

  getPageNumbers(): number[] {
    const currentPage = this.filter().page || 1;
    const totalPages = this.lastPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      }
    }
    return pages;
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.fetchAndUpdateBlogs();
  }

  onSortChange(event: { active: string; direction: 'asc' | 'desc' | '' }) {
    if (!event.direction) {
      return;
    }
    this.filter.update((f) => ({
      ...f,
      orderBy: event.active,
      orderByVal: event.direction as 'asc' | 'desc',
      page: 1,
    }));
    this.clearCache();
    this.fetchAndUpdateBlogs();
  }

  onSearch(searchTerm: string) {
    this.filter.update((f) => ({
      ...f,
      search: searchTerm || undefined,
      page: 1,
    }));
    this.clearCache();
    this.fetchAndUpdateBlogs();
  }

  onEditBlog(blog: Blog) {
    this.router.navigate(['/blog', blog.id]);
  }

  async onDeleteBlog(blog: Blog) {
    const result = await Swal.fire({
      title: this.translateService.instant('Are you sure?'),
      text: this.translateService.instant(
        'You will not be able to recover this blog!'
      ),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('Yes, delete it!'),
      cancelButtonText: this.translateService.instant('Cancel'),
    });

    if (result.isConfirmed) {
      try {
        await this.blogService.deleteBlog(blog.id);
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('Deleted!'),
          text: this.translateService.instant('Blog has been deleted.'),
        });
        this.clearCache();
        await this.fetchAndUpdateBlogs();
      } catch (error) {
        this.logger.logError(error);
      }
    }
  }
}
