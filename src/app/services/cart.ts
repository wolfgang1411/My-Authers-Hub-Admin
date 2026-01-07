import { Injectable } from '@angular/core';
import { Server } from './server';
import { LoaderService } from './loader';
import { Logger } from './logger';
import { CartItem, AddCartItem, RemoveCartItem, Pagination } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  constructor(
    private serverService: Server,
    private loader: LoaderService,
    private logger: Logger
  ) {}

  async getCartItems(page: number = 1, itemsPerPage: number = 30) {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<Pagination<CartItem>>('cart/items', {
          page,
          itemsPerPage,
        }),
        'cart'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async getCartItem(id: number) {
    try {
      return await this.loader.loadPromise(
        this.serverService.get<CartItem>(`cart/items/${id}`),
        'cart'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async addCartItems(items: AddCartItem[]) {
    try {
      return await this.loader.loadPromise(
        this.serverService.post<CartItem[]>('cart/items/add', {
          data: items,
        }),
        'cart'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async removeCartItems(items: RemoveCartItem[]) {
    try {
      return await this.loader.loadPromise(
        this.serverService.delete<{ success: boolean; message: string }>(
          'cart/items/remove',
          { data: items }
        ),
        'cart'
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }
}

