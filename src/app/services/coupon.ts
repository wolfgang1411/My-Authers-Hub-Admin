import { inject, Injectable } from '@angular/core';
import { Server } from './server';
import { Logger } from './logger';
import { LoaderService } from './loader';
import { Coupon, CouponFilter, UpdateCoupon } from '../interfaces/Coupon';
import { Pagination } from '../interfaces';
import { th } from 'date-fns/locale';

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  private serverService = inject(Server);
  private loggerService = inject(Logger);
  private loaderService = inject(LoaderService);

  async fetchCoupons(filter: CouponFilter) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.get<Pagination<Coupon>>('coupon', filter),
        'load-coupons'
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async createOrUpdateCoupon(data: UpdateCoupon) {
    try {
      data = { ...data };
      const method = data.id ? 'patch' : 'post';
      const url = data.id ? `coupon/${data.id}` : 'coupon';
      delete data.id;
      return await this.loaderService.loadPromise(
        this.serverService[method]<Coupon>(url, data)
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }

  async deleteCoupon(id: number) {
    try {
      return await this.loaderService.loadPromise(
        this.serverService.delete<Coupon>(`coupon/${id}`)
      );
    } catch (error) {
      this.loggerService.logError(error);
      throw error;
    }
  }
}
