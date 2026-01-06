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
    status: 'ALL',
  });

  BlogStatus = BlogStatus;
  lastSelectedStatus: BlogStatus | 'ALL' = 'ALL';

  blogStatuses = computed(() => {
    return Object.values(BlogStatus);
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
      status: currentFilter.status,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  displayedColumns = computed(() => {
    const baseColumns = ['title'];

    // Only show author and publisher columns for SUPERADMIN
    if (this.isSuperAdmin()) {
      baseColumns.push('author', 'publisher');
    }

    baseColumns.push('publishedAt', 'createdAt', 'actions');
    return baseColumns;
  });

  // Map display column names to API field names
  getApiFieldName = (column: string): string | null => {
    const columnMap: Record<string, string> = {
      title: 'title',
      publishedAt: 'publishedAt',
      createdAt: 'createdAt',
    };
    return columnMap[column] || null;
  };

  onStatusChange(status: BlogStatus | 'ALL') {
    this.lastSelectedStatus = status;
    this.filter.update((f) => ({
      ...f,
      status: status === 'ALL' ? undefined : status,
      page: 1,
    }));
    this.clearCache();
    this.fetchAndUpdateBlogs();
  }

  isSortable = (column: string): boolean => {
    return this.getApiFieldName(column) !== null;
  };

  async ngOnInit() {
    await this.fetchAndUpdateBlogs();
  }

  mapBlogsToDataSource() {
    const blogs = this.blogs();
    if (blogs) {
      this.dataSource.data = blogs.map((blog) => {
        const mappedBlog: any = {
          ...blog,
          title: blog.title,
          status: blog.status,
          publishedAt: blog.publishedAt
            ? new Date(blog.publishedAt).toLocaleDateString()
            : 'N/A',
          createdAt: new Date(blog.createdAt).toLocaleDateString(),
          actions: blog, // Pass the full blog object
        };

        // Only include author and publisher if user is SUPERADMIN
        // (they won't be in the response for non-SUPERADMIN, but this is a safety check)
        if (this.isSuperAdmin()) {
          mappedBlog.author = blog.author?.user?.fullName || 'N/A';
          mappedBlog.publisher = blog.publisher?.name || 'N/A';
        }

        return mappedBlog;
      });
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

      // Remove undefined/null values from filter before sending to API
      const cleanFilter: BlogFilter = {};
      if (currentFilter.page !== undefined && currentFilter.page !== null) {
        cleanFilter.page = currentFilter.page;
      }
      if (currentFilter.itemsPerPage !== undefined && currentFilter.itemsPerPage !== null) {
        cleanFilter.itemsPerPage = currentFilter.itemsPerPage;
      }
      if (currentFilter.orderBy !== undefined && currentFilter.orderBy !== null) {
        cleanFilter.orderBy = currentFilter.orderBy;
      }
      if (currentFilter.orderByVal !== undefined && currentFilter.orderByVal !== null) {
        cleanFilter.orderByVal = currentFilter.orderByVal;
      }
      if (currentFilter.search !== undefined && currentFilter.search !== null && currentFilter.search !== '') {
        cleanFilter.search = currentFilter.search;
      }
      if (currentFilter.status !== undefined && currentFilter.status !== null && currentFilter.status !== 'ALL') {
        cleanFilter.status = currentFilter.status;
      }

      // Fetch from API (backend handles access level logic)
      const {
        items,
        itemsPerPage: returnedItemsPerPage,
        totalCount,
      } = await this.blogService.fetchBlogs(cleanFilter);

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

    const apiFieldName = this.getApiFieldName(event.active);
    if (!apiFieldName) {
      return;
    }

    const direction: 'asc' | 'desc' =
      event.direction === 'asc' || event.direction === 'desc'
        ? event.direction
        : 'desc';

    this.filter.update((f) => ({
      ...f,
      orderBy: apiFieldName,
      orderByVal: direction,
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

  onViewBlog(blog: Blog) {
    this.router.navigate(['/blogs/view', blog.id]);
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
