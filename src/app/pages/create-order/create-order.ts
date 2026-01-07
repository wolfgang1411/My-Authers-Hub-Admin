import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CartService } from '../../services/cart';
import { OrderService } from '../../services/order';
import { TitleService } from '../titles/title-service';
import { AddressService } from '../../services/address-service';
import {
  CartItem,
  AddCartItem,
  Title,
  TitleFilter,
  Address,
  Pagination,
  TitleStatus,
  Platform,
} from '../../interfaces';
import { SharedModule } from '../../modules/shared/shared-module';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { TranslateService } from '@ngx-translate/core';
import { Logger } from '../../services/logger';
import Swal from 'sweetalert2';
import { Subject, debounceTime } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [
    SharedModule,
    RouterModule,
    MatIcon,
    MatButton,
    MatIconButton,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './create-order.html',
  styleUrl: './create-order.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOrder implements OnInit {
  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private titleService: TitleService,
    private addressService: AddressService,
    private translateService: TranslateService,
    private logger: Logger,
    private userService: UserService
  ) {}

  cartItems = signal<CartItem[]>([]);
  isLoading = signal(false);
  selectedDeliveryAddressId = signal<number | null>(null);
  selectedBillingAddressId = signal<number | null>(null);
  billingSameAsDelivery = signal(true);
  addresses = signal<Address[]>([]);
  user = signal<User | null>(null);

  // Title browsing
  showTitleBrowser = signal(false);
  titles = signal<Title[]>([]);
  titleSearchStr = new Subject<string>();
  titleFilter = signal<TitleFilter>({
    page: 1,
    itemsPerPage: 20,
    searchStr: '',
    status: TitleStatus.APPROVED,
  });

  // Computed values
  subtotal = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.total, 0);
  });

  deliveryCharges = computed(() => {
    // Delivery charges would be calculated based on weight/items
    // For now, return 0 or fetch from API
    return 0;
  });

  totalAmount = computed(() => {
    return this.subtotal() + this.deliveryCharges();
  });

  numberOfTitles = computed(() => {
    return this.cartItems().length;
  });

  totalQuantity = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  });

  ngOnInit(): void {
    this.user.set(this.userService.loggedInUser$());
    this.loadCartItems();
    this.loadAddresses();

    // Setup title search
    this.titleSearchStr
      .pipe(debounceTime(400))
      .subscribe((value) => {
        this.titleFilter.update((f) => ({ ...f, searchStr: value, page: 1 }));
        this.searchTitles();
      });
  }

  async loadCartItems() {
    try {
      this.isLoading.set(true);
      const response = await this.cartService.getCartItems(1, 100);
      this.cartItems.set(response.items || []);
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translateService.instant('failedtoloadcart') ||
          'Failed to load cart',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadAddresses() {
    try {
      // Fetch user addresses - this would need to be implemented in the API
      // For now, we'll use a placeholder
      // const addresses = await this.addressService.getUserAddresses();
      // this.addresses.set(addresses);
    } catch (error) {
      this.logger.logError(error);
    }
  }

  async searchTitles() {
    try {
      const filter = this.titleFilter();
      const response = await this.titleService.getTitles(filter);
      this.titles.set(response.items || []);
    } catch (error) {
      this.logger.logError(error);
    }
  }

  getPlatformId(platform: any): number {
    // Platform can be PlatForm enum, Platform object, or number
    if (typeof platform === 'number') return platform;
    if (typeof platform === 'object' && platform?.id) return platform.id;
    // If it's an enum value, we need to look it up - for now return 0 as fallback
    return 0;
  }

  getPlatformName(platform: any): string {
    if (typeof platform === 'object' && platform?.name) return platform.name;
    if (typeof platform === 'string') return platform;
    return 'Platform';
  }

  async addToCart(title: Title, platformId: number, quantity: number = 1) {
    try {
      const item: AddCartItem = {
        titleId: title.id,
        platformId,
        quantity,
      };

      await this.cartService.addCartItems([item]);
      await this.loadCartItems();
      this.showTitleBrowser.set(false);

      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success') || 'Success',
        text:
          this.translateService.instant('itemaddedtocart') ||
          'Item added to cart',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translateService.instant('failedtoadditem') ||
          'Failed to add item to cart',
      });
    }
  }

  async updateQuantity(item: CartItem, newQuantity: number) {
    if (newQuantity < 1) {
      await this.removeItem(item);
      return;
    }

    try {
      const diff = newQuantity - item.quantity;
      if (diff > 0) {
        // Add more
        await this.cartService.addCartItems([
          {
            titleId: item.titleId,
            platformId: item.platformId,
            quantity: diff,
          },
        ]);
      } else {
        // Remove some
        await this.cartService.removeCartItems([
          {
            cartItemId: item.id,
            quantity: Math.abs(diff),
          },
        ]);
      }
      await this.loadCartItems();
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translateService.instant('failedtoupdatequantity') ||
          'Failed to update quantity',
      });
    }
  }

  async removeItem(item: CartItem) {
    try {
      await this.cartService.removeCartItems([
        {
          cartItemId: item.id,
          quantity: item.quantity,
        },
      ]);
      await this.loadCartItems();
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translateService.instant('failedtoremoveitem') ||
          'Failed to remove item',
      });
    }
  }

  async placeOrder() {
    if (this.cartItems().length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning') || 'Warning',
        text:
          this.translateService.instant('cartisempty') ||
          'Your cart is empty',
      });
      return;
    }

    if (!this.selectedDeliveryAddressId()) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning') || 'Warning',
        text:
          this.translateService.instant('pleaseselectdeliveryaddress') ||
          'Please select a delivery address',
      });
      return;
    }

    try {
      this.isLoading.set(true);

      // Convert cart items to order items
      const orderItems = this.cartItems().map((item) => ({
        titleId: item.titleId,
        platformId: item.platformId,
        quantity: item.quantity,
        coupon: item.couponCode,
      }));

      const orderData = {
        data: orderItems,
        deliveryAddressId: this.selectedDeliveryAddressId()!,
        billingAddressId: this.billingSameAsDelivery()
          ? undefined
          : this.selectedBillingAddressId()!,
        billingAddressSameAsDelivery: this.billingSameAsDelivery(),
      };

      await this.orderService.createOrder(orderData);

      // Clear cart
      for (const item of this.cartItems()) {
        await this.cartService.removeCartItems([
          {
            cartItemId: item.id,
            quantity: item.quantity,
          },
        ]);
      }

      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success') || 'Success',
        text:
          this.translateService.instant('orderplacedsuccessfully') ||
          'Order placed successfully',
      }).then(() => {
        // Navigate to orders page
        window.location.href = '/my-orders';
      });
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          (error as any)?.message ||
          this.translateService.instant('failedtoplaceorder') ||
          'Failed to place order',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  openTitleBrowser() {
    this.showTitleBrowser.set(true);
    this.searchTitles();
  }

  closeTitleBrowser() {
    this.showTitleBrowser.set(false);
  }
}

