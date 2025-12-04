import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { SharedTitlesService, SharedTitle } from './shared-titles-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from '../../components/list-table/list-table';
import { MatIconModule } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { Signal } from '@angular/core';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { TitleService } from '../titles/title-service';

@Component({
  selector: 'app-shared-titles',
  imports: [
    SharedModule,
    RouterLink,
    ListTable,
    MatIconModule,
    MatIconButton,
    MatButton,
  ],
  templateUrl: './shared-titles.html',
  styleUrl: './shared-titles.css',
})
export class SharedTitles implements OnInit {
  loggedInUser!: Signal<User | null>;
  sharedTitles = signal<SharedTitle[]>([]);
  displayedColumns: string[] = ['title', 'code', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<any>();
  page = signal(1);
  itemsPerPage = 30;
  totalCount = signal(0);
  isLoading = signal(false);

  constructor(
    private sharedTitlesService: SharedTitlesService,
    private userService: UserService,
    private translateService: TranslateService,
    private titleService: TitleService,
    private router: Router
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  ngOnInit(): void {
    // Only superadmin can access this page
    if (this.loggedInUser()?.accessLevel !== 'SUPERADMIN') {
      this.router.navigate(['/titles']);
      return;
    }
    this.fetchSharedTitles();
  }

  async fetchSharedTitles() {
    try {
      this.isLoading.set(true);
      const { items, totalCount } =
        await this.sharedTitlesService.getSharedTitles({
          page: this.page(),
          itemsPerPage: this.itemsPerPage,
        });

      console.log(items);

      this.sharedTitles.set(items);
      this.totalCount.set(totalCount);
      this.mapDataList();

      //   // Handle pagination response
      //   if (response && Array.isArray(response.items)) {
      //     this.sharedTitles.set(response.items);
      //     this.totalCount.set(response.totalCount || 0);
      //     this.mapDataList();
      //   } else {
      //     // Fallback if response structure is different
      //     console.warn('Unexpected response structure:', response);
      //     this.sharedTitles.set([]);
      //     this.totalCount.set(0);
      //     this.dataSource.data = [];
      //   }
    } catch (error) {
      console.error('Error fetching shared titles:', error);
      this.sharedTitles.set([]);
      this.totalCount.set(0);
      this.dataSource.data = [];
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('error') ||
          'Failed to load shared titles',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  mapDataList() {
    const mapped = this.sharedTitles().map((sharedTitle) => ({
      ...sharedTitle,
      title: sharedTitle.title.name,
      code: sharedTitle.code,
      createdAt: sharedTitle.createdAt
        ? format(new Date(sharedTitle.createdAt), 'dd-MM-yyyy HH:mm')
        : 'N/A',
      actions: '',
    }));

    this.dataSource.data = mapped;
  }

  async onClickDelete(sharedTitle: SharedTitle) {
    const { value } = await Swal.fire({
      icon: 'warning',
      title: this.translateService.instant('areyousure'),
      html: `Are you sure you want to delete shared title for "${sharedTitle.title.name}"?`,
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('yes'),
      cancelButtonText: this.translateService.instant('no'),
      customClass: {
        confirmButton: '!bg-accent',
        cancelButton: '!bg-primary',
      },
    });
    if (!value) return;

    try {
      await this.sharedTitlesService.deleteSharedTitle(sharedTitle.id);
      this.sharedTitles.update((titles) =>
        titles.filter((t) => t.id !== sharedTitle.id)
      );
      this.dataSource.data = this.dataSource.data.filter(
        ({ id }) => id !== sharedTitle.id
      );
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text: 'Shared title deleted successfully',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error deleting shared title:', error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: 'Failed to delete shared title',
      });
    }
  }

  async onClickCreate() {
    const { value: titleId } = await Swal.fire({
      icon: 'info',
      title: 'Select Title to Share',
      input: 'number',
      inputLabel: 'Title ID',
      inputPlaceholder: 'Enter title ID',
      showCancelButton: true,
      confirmButtonText: 'Share',
      confirmButtonColor: '#3d1a5d',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter a title ID';
        }
        if (isNaN(Number(value)) || Number(value) <= 0) {
          return 'Please enter a valid title ID';
        }
        return null;
      },
    });

    if (!titleId) return;

    try {
      const sharedTitle = await this.sharedTitlesService.createSharedTitle(
        Number(titleId)
      );
      // Refresh the list to show the new shared title
      this.page.set(1);
      await this.fetchSharedTitles();
      Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `Title shared successfully!<br>Share Code: <strong>${sharedTitle.code}</strong>`,
        timer: 3000,
        showConfirmButton: true,
      });
    } catch (error: any) {
      console.error('Error creating shared title:', error);
      const errorMessage =
        error?.error?.message ||
        this.translateService.instant('error') ||
        'Failed to create shared title';
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: errorMessage,
      });
    }
  }

  onPageChange(page: number) {
    this.page.set(page);
    this.fetchSharedTitles();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.itemsPerPage);
  }
}
