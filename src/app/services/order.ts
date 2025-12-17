import { Injectable } from '@angular/core';
import { Server } from './server';
import { LoaderService } from './loader';
import { Logger } from './logger';
import { Order, OrderFilter, Pagination } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(
    private serverService: Server,
    private loader: LoaderService,
    private logger: Logger
  ) {}

  async fetchOrders(filter: OrderFilter) {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<Pagination<Order>>('order', filter),
        'orders'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchOrder(id: number | string) {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<Order>(`order/${id}`),
        'order'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async updateDeliveryStatus(id: number, deliveryStatus: string) {
    try {
      return await this.loader.loadPromise(
        this.serverService.patch<Order>(`order/${id}/delivery-status`, {
          deliveryStatus,
        }),
        'order'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}
