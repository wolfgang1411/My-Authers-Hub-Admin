import { Component, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { CouponService } from '../../services/coupon';
import { Coupon, CouponFilter, UpdateCoupon } from '../../interfaces/Coupon';
import { DiscountType, Title, TitleStatus } from '../../interfaces';
import { MatDialog } from '@angular/material/dialog';
import { AddUpdateCoupon } from '../../components/add-update-coupon/add-update-coupon';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TitleService } from '../titles/title-service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-coupon',
  imports: [SharedModule, ListTable, MatButtonModule, MatIconModule],
  templateUrl: './coupon.html',
  styleUrl: './coupon.css',
})
export class CouponComponent implements OnInit {
  matDialog = inject(MatDialog);
  titleService = inject(TitleService);
  couponService = inject(CouponService);

  titleList = signal<Title[] | null>(null);
  dataSource = new MatTableDataSource<any>();

  lastPage = signal(1);
  
  filter = signal<CouponFilter>({
    itemsPerPage: 10,
    page: 1,
  });
  coupons = signal<Coupon[] | null>(null);
  
  // Cache to store fetched pages
  private pageCache = new Map<number, Coupon[]>();
  private cachedFilterKey = '';
  
  private getFilterKey(): string {
    const currentFilter = this.filter();
    return JSON.stringify({
      itemsPerPage: currentFilter.itemsPerPage,
    });
  }

  private clearCache() {
    this.pageCache.clear();
    this.cachedFilterKey = '';
  }

  displayedColumns: string[] = [
    'coupon',
    'discountvalue',
    'startdate/enddate',
    'usedcount',
    'actions',
  ];

  async ngOnInit() {
    await this.fetchTitleList();
    await this.fetchAndUpdateCoupons();
  }

  async fetchTitleList() {
    const { items } = await this.titleService.getTitleWithLessDetails({
      status: TitleStatus.APPROVED,
    });
    this.titleList.set(items);
  }

  mapCouponsToDataSource() {
    const coupons = this.coupons();
    if (coupons) {
      this.dataSource.data = coupons.map((coupon) => ({
        ...coupon,
        coupon: coupon.code,
        discountvalue: `${coupon.discountValue}${
          coupon.discountType === DiscountType.PERCENT ? '%' : ''
        }`,
        'startdate/enddate':
          coupon.startDate || coupon.endDate
            ? `${
                coupon.startDate
                  ? new Date(coupon.startDate).toLocaleDateString()
                  : '-'
              } - ${
                coupon.endDate
                  ? new Date(coupon.endDate).toLocaleDateString()
                  : '-'
              }`
            : undefined,
        usedcount: coupon.usedCount || 0,
        actions: coupon.id,
      }));
    } else {
      this.dataSource.data = [];
    }
  }

  async fetchAndUpdateCoupons() {
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
        const cachedCoupons = this.pageCache.get(currentPage)!;
        this.coupons.set(cachedCoupons);
        this.mapCouponsToDataSource();
        return;
      }

      // Fetch from API
      const { items, itemsPerPage: returnedItemsPerPage, totalCount } =
        await this.couponService.fetchCoupons(currentFilter);

      // Cache the fetched page
      this.pageCache.set(currentPage, items);
      this.coupons.set(items);
      this.lastPage.set(Math.ceil(totalCount / returnedItemsPerPage));
      this.mapCouponsToDataSource();
    } catch (error) {
      console.log(error);
    }
  }
  
  nextPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage < this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: currentPage + 1 }));
      this.fetchAndUpdateCoupons();
    }
  }

  previousPage() {
    const currentPage = this.filter().page || 1;
    if (currentPage > 1) {
      this.filter.update((f) => ({ ...f, page: currentPage - 1 }));
      this.fetchAndUpdateCoupons();
    }
  }

  goToPage(pageNumber: number) {
    if (pageNumber >= 1 && pageNumber <= this.lastPage()) {
      this.filter.update((f) => ({ ...f, page: pageNumber }));
      this.fetchAndUpdateCoupons();
    }
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.filter.update((f) => ({ ...f, itemsPerPage, page: 1 }));
    this.clearCache();
    this.fetchAndUpdateCoupons();
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

  onAddUpdateCoupon(coupon?: Coupon) {
    const dialog = this.matDialog.open(AddUpdateCoupon, {
      maxHeight: '90vw',
      data: {
        coupon,
        titleList: this.titleList(),
        onSubmit: async (data: UpdateCoupon) => {
          const response = await this.couponService.createOrUpdateCoupon({
            ...data,
            id: coupon?.id,
          });

          this.coupons.update((coupons) => {
            if (coupon) {
              return (
                coupons?.map((c) => (c.id === response.id ? response : c)) || []
              );
            } else {
              return [response, ...(coupons || [])];
            }
          });

          this.mapCouponsToDataSource();
          dialog.close();
          Swal.fire({
            icon: 'success',
          });
        },
        onClose: () => dialog.close(),
      },
    });
  }

  async onDeleteCoupon(coupon: Coupon) {
    try {
      const { value } = await Swal.fire({
        icon: 'warning',
        title: 'Are you sure?',
        text: `You are about to delete coupon "${coupon.code}". This action cannot be undone.`,
        showCancelButton: true,
        cancelButtonText: 'No',
        confirmButtonText: 'Yes, delete it!',
        customClass: {
          confirmButton: '!bg-red-500',
          cancelButton: '!bg-primary',
        },
      });
      if (!value) return;
      await this.couponService.deleteCoupon(coupon.id);
      this.coupons.update((coupons) => {
        return coupons?.filter((c) => c.id !== coupon.id) || [];
      });
      this.mapCouponsToDataSource();
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: `Coupon "${coupon.code}" has been deleted.`,
      });
    } catch (error) {
      console.log(error);
    }
  }
}
