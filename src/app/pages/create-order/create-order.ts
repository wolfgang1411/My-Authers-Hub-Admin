import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CartService } from '../../services/cart';
import { OrderService } from '../../services/order';
import { TransactionService } from '../../services/transaction';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { PlatformService } from '../../services/platform';
import { StaticValuesService } from '../../services/static-values';
import { PlatForm } from '../../interfaces';
import { MatDialog } from '@angular/material/dialog';
import { TitleBrowserDialog } from '../../components/title-browser-dialog/title-browser-dialog';
import { AddAddressDialog } from '../../components/add-address-dialog/add-address-dialog';

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
    private transactionService: TransactionService,
    private titleService: TitleService,
    private addressService: AddressService,
    private translateService: TranslateService,
    private logger: Logger,
    private userService: UserService,
    private platformService: PlatformService,
    private staticValuesService: StaticValuesService,
    private dialog: MatDialog
  ) {}

  cartItems = signal<CartItem[]>([]);
  isLoading = signal(false);
  selectedDeliveryAddressId = signal<number | null>(null);
  selectedBillingAddressId = signal<number | null>(null);
  billingSameAsDelivery = signal(true);
  addresses = signal<Address[]>([]);
  user = signal<User | null>(null);
  mahPrintPlatformId = signal<number | null>(null);

  // Title browsing - removed signals as dialog handles its own state

  isAuthor = computed(() => {
    return this.user()?.accessLevel === 'AUTHER';
  });

  isPublisher = computed(() => {
    return this.user()?.accessLevel === 'PUBLISHER';
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

  async ngOnInit(): Promise<void> {
    this.user.set(this.userService.loggedInUser$());
    await this.loadMAHPrintPlatform();
    this.loadCartItems();
    this.loadAddresses();
  }

  async loadMAHPrintPlatform() {
    try {
      const platforms = await this.platformService.fetchPlatforms();
      const mahPrint = platforms.find((p) => p.name === PlatForm.MAH_PRINT);
      if (mahPrint) {
        this.mahPrintPlatformId.set(mahPrint.id);
      }
    } catch (error) {
      // Error already handled by service logger, just log here
      console.error('Failed to load MAH_PRINT platform:', error);
    }
  }

  async loadCartItems() {
    try {
      this.isLoading.set(true);
      const response = await this.cartService.getCartItems(1, 100);
      this.cartItems.set(response.items || []);
    } catch (error) {
      // Error already handled by service logger, just log here
      console.error('Failed to load cart:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadAddresses() {
    try {
      const user = this.userService.loggedInUser$();
      if (!user) return;

      // Get addresses from user object (addresses are now linked to user, not author/publisher)
      const userAddresses: Address[] = user.address || [];
      const authorAddresses: Address[] = user.auther?.address || [];
      const publisherAddresses: Address[] = user.publisher?.address || [];
      const addresses = [...userAddresses, ...authorAddresses, ...publisherAddresses];

      this.addresses.set(addresses);

      // Set default selected address if available
      if (userAddresses.length > 0 && !this.selectedDeliveryAddressId()) {
        this.selectedDeliveryAddressId.set(userAddresses[0].id);
        this.selectedBillingAddressId.set(userAddresses[0].id);
      }
    } catch (error) {
      // Error already handled by service logger, just log here
      console.error('Failed to load addresses:', error);
    }
  }

  openAddAddressDialog() {
    const dialogRef = this.dialog.open(AddAddressDialog, {
      width: '500px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe(async (newAddress) => {
      if (newAddress) {
        // Refresh user data to get updated addresses
        await this.userService.refreshLoggedInUser();
        // Reload addresses from updated user
        await this.loadAddresses();

        // Select the newly added address
        if (newAddress.id) {
          this.selectedDeliveryAddressId.set(newAddress.id);
          this.selectedBillingAddressId.set(newAddress.id);
        }
      }
    });
  }

  getTitlePrice(title: Title): number {
    const user = this.user();
    if (!user) return 0;

    const printing = title.printing?.[0];

    // For authors
    if (this.isAuthor()) {
      const authorTitle = title.authors?.find((at) => at.author.id === user.auther?.id);

      if (authorTitle?.allowAuthorCopy && printing) {
        // Use custom print cost or print cost
        console.log(printing.customPrintCost, printing.printCost, 'printing');
        return printing.customPrintCost || printing.printCost || 0;
      } else {
        // If isAuthorCopy is not allowed, show price from platform MAH_PRINT
        const mahPrintPricing = title.pricing?.find(
          (p) => p.platform === PlatForm.MAH_PRINT
        );
        return mahPrintPricing?.salesPrice || 0;
      }
    }

    // For publishers: always show printing price
    if (this.isPublisher() && printing) {
      return printing.printCost || 0;
    }

    // Fallback to MAH_PRINT pricing
    const mahPrintPricing = title.pricing?.find(
      (p) => p.platform === PlatForm.MAH_PRINT
    );
    return mahPrintPricing?.salesPrice || 0;
  }

  async addToCart(title: Title, quantity: number = 1) {
    try {
      const mahPrintId = this.mahPrintPlatformId();
      if (!mahPrintId) {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Error',
          text: 'MAH_PRINT platform not found',
        });
        return;
      }

      const item: AddCartItem = {
        titleId: title.id,
        platformId: mahPrintId, // Always use MAH_PRINT
        quantity,
      };

      await this.cartService.addCartItems([item]);
      await this.loadCartItems();
      // Item added successfully, no popup needed
    } catch (error) {
      // Error already handled by service logger, just log here
      console.error('Failed to add item to cart:', error);
    }
  }

  async updateQuantity(item: CartItem, newQuantity: number) {
    if (newQuantity < 1) {
      await this.removeItem(item);
      return;
    }

    try {
      const mahPrintId = this.mahPrintPlatformId();
      if (!mahPrintId) {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Error',
          text: 'MAH_PRINT platform not found',
        });
        return;
      }

      // Get titleId - it should be available directly or from titleDetails
      const titleId = item.titleId ?? item.titleDetails?.id ?? item.title?.id;
      if (!titleId || isNaN(Number(titleId))) {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Error',
          text: 'Title ID not found in cart item',
        });
        return;
      }

      const diff = newQuantity - item.quantity;
      if (diff > 0) {
        // Add more - always use MAH_PRINT
        await this.cartService.addCartItems([
          {
            titleId: Number(titleId), // Ensure it's a number
            platformId: mahPrintId,
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
      // Error already handled by service logger, just log here
      console.error('Failed to update quantity:', error);
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
      // Error already handled by service logger, just log here
      console.error('Failed to remove item:', error);
    }
  }

  async placeOrder() {
    if (this.cartItems().length === 0) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning') || 'Warning',
        text:
          this.translateService.instant('cartisempty') || 'Your cart is empty',
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

      const mahPrintId = this.mahPrintPlatformId();
      if (!mahPrintId) {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Error',
          text: 'MAH_PRINT platform not found',
        });
        return;
      }

      // Convert cart items to order items - always use MAH_PRINT
      const orderItems = this.cartItems().map((item) => ({
        titleId: item.titleId,
        platformId: mahPrintId, // Always use MAH_PRINT
        quantity: item.quantity,
        coupon: item.couponCode,
      }));

      // Build base URL for order details page
      const orderDetailsBaseUrl = `${window.location.origin}/orders`;

      const orderData = {
        data: orderItems,
        deliveryAddressId: this.selectedDeliveryAddressId()!,
        billingAddressId: this.billingSameAsDelivery()
          ? undefined
          : this.selectedBillingAddressId()!,
        billingAddressSameAsDelivery: this.billingSameAsDelivery(),
        // Use PLACEHOLDER which will be replaced with actual order ID after creation
        successClientUrl: `${orderDetailsBaseUrl}/PLACEHOLDER`,
        failureClientUrl: `${orderDetailsBaseUrl}/PLACEHOLDER`,
      };

      // Create order (URLs will be updated with actual order ID in the backend)
      const order = await this.orderService.createOrder(orderData);

      // Create transaction and get payment URL
      const transactionResponse =
        await this.transactionService.createTransaction(order.id);

      // Clear cart
      for (const item of this.cartItems()) {
        await this.cartService.removeCartItems([
          {
            cartItemId: item.id,
            quantity: item.quantity,
          },
        ]);
      }

      // Redirect to payment URL
      if (transactionResponse?.url) {
        window.location.href = transactionResponse.url;
      } else {
        // Fallback if URL is not available
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Error',
          text: 'Payment URL not available',
        });
      }
    } catch (error) {
      // Error already handled by service logger, just log here
      console.error('Failed to place order:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  openTitleBrowser() {
    const dialogRef = this.dialog.open(TitleBrowserDialog, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '85vh',
      data: {
        onAddToCart: (title: Title) => this.addToCart(title, 1),
        getTitlePrice: (title: Title) => this.getTitlePrice(title),
      },
    });
  }
}
