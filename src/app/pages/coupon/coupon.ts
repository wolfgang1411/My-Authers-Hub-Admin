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

  filter = signal<CouponFilter>({
    itemsPerPage: 30,
    page: 1,
  });
  coupons = signal<Coupon[] | null>(null);
  lastPage = signal(1);

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
      const { items, itemsPerPage, page, totalCount } =
        await this.couponService.fetchCoupons(this.filter());

      this.coupons.update((coupons) => {
        return page === 1 ? items : [...(coupons || []), ...items];
      });
      this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
      this.mapCouponsToDataSource();
    } catch (error) {
      console.log(error);
    }
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
