import {
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  Pipe,
  PipeTransform,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CreateSale,
  CreateSaleForm,
  PlatForm,
  PublishingType,
  SalesType,
  Title,
  TitleStatus,
} from '../../interfaces';
import { Platform } from '../../interfaces/Platform';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TitleService } from '../../pages/titles/title-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { StaticValuesService } from '../../services/static-values';
import { PlatformService } from '../../services/platform';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  NgxMatDatepickerActions,
  NgxMatDatepickerApply,
  NgxMatDatepickerCancel,
  NgxMatDatepickerInput,
  NgxMatDatetimepicker,
} from '@ngxmc/datetime-picker';
import { MyDatePipe } from '../../pipes/my-date-pipe';
import { format } from 'date-fns';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Pipe({
  name: 'myTitleFilterBySale',
})
export class TitleFilterBySale implements PipeTransform {
  transform(value?: Title[] | null, availableIds?: number[] | null) {
    if (!availableIds || !availableIds.length) return value;
    return value?.filter(({ id }) => availableIds.includes(id));
  }
}

@Component({
  selector: 'app-add-sales',
  imports: [
    SharedModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    NgxMatDatepickerActions,
    NgxMatDatepickerApply,
    NgxMatDatepickerCancel,
    NgxMatDatepickerInput,
    NgxMatDatetimepicker,
    MyDatePipe,
    MatIconModule,
    NgxMatSelectSearchModule,
    MatProgressSpinnerModule,
  ],

  templateUrl: './add-sales.html',
  styleUrl: './add-sales.css',
})
export class AddSales implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private titleService: TitleService,
    private staticValueService: StaticValuesService,
    private platformService: PlatformService,
  ) {}

  data = inject<Inputs>(MAT_DIALOG_DATA);
  form = new FormGroup({
    salesArray: new FormArray<FormGroup<CreateSaleForm>>([]),
  });

  lastSelectedSaleType: SalesType | null = null;
  salesTypes = SalesType;
  salesType = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.SalesType || {},
    ) as SalesType[];
  });

  platforms = signal<Platform[]>([]);

  titles = signal<Title[] | null>(null);

  // Title search controls - one per form array item
  titleSearchControls = new Map<number, FormControl<string | null>>();
  filteredTitleOptions = new Map<
    number,
    WritableSignal<{ label: string; value: number }[]>
  >();
  isSearchingTitles = new Map<number, WritableSignal<boolean>>();

  // Computed map of available platforms by titleId (kept for backward compatibility if needed)
  availablePlatformsByTitle = computed(() => {
    const allPlatforms = this.platforms();
    const titles = this.titles();
    const map = new Map<number, Platform[]>();

    if (!allPlatforms || allPlatforms.length === 0 || !titles) {
      return map;
    }

    titles.forEach((title) => {
      const publishingType = title.publishingType;
      const isOnlyEbook = publishingType === PublishingType.ONLY_EBOOK;
      const isOnlyPrint = publishingType === PublishingType.ONLY_PRINT;

      // Get platforms that have pricing data for this title
      const pricingPlatformNames = title.pricing
        ?.map((p) => p.platform)
        .filter((platform) => platform !== null && platform !== undefined) as
        | string[]
        | undefined;

      if (!pricingPlatformNames || !pricingPlatformNames.length) {
        map.set(title.id, []);
        return;
      }

      // Filter platforms that have pricing and match the publishing type
      let filteredPlatforms = allPlatforms.filter((platform) =>
        pricingPlatformNames.includes(platform.name),
      );

      // Filter based on publishing type
      if (isOnlyEbook) {
        filteredPlatforms = filteredPlatforms.filter(
          (platform) => platform.isEbookPlatform,
        );
      } else if (isOnlyPrint) {
        filteredPlatforms = filteredPlatforms.filter(
          (platform) => !platform.isEbookPlatform,
        );
      }

      map.set(title.id, filteredPlatforms);
    });

    return map;
  });

  // Signal to track form array changes for reactivity
  private salesArrayUpdateTrigger = signal(0);

  // Summary calculations
  totalQuantity = computed(() => {
    // Read trigger to make computed reactive
    this.salesArrayUpdateTrigger();

    return this.form.controls.salesArray.controls.reduce((sum, group) => {
      const qty = group.controls.quantity.value || 0;
      return sum + Number(qty);
    }, 0);
  });

  salesSummary = computed(() => {
    // Read trigger to make computed reactive
    this.salesArrayUpdateTrigger();

    const summary: { type: SalesType; count: number }[] = [];
    const typeMap = new Map<SalesType, number>();

    this.form.controls.salesArray.controls.forEach((group) => {
      const type = group.controls.type.value;
      if (type) {
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }
    });

    typeMap.forEach((count, type) => {
      summary.push({ type, count });
    });

    return summary;
  });

  totalAmount = computed(() => {
    // Read trigger to make computed reactive
    this.salesArrayUpdateTrigger();

    return this.form.controls.salesArray.controls.reduce((sum, group) => {
      // Only count amount for INVENTORY sales where amount is provided
      if (
        group.controls.type.value === 'INVENTORY' &&
        group.controls.amount.value
      ) {
        const amount = Number(group.controls.amount.value) || 0;
        const qty = Number(group.controls.quantity.value) || 1;
        return sum + amount * qty;
      }
      return sum;
    }, 0);
  });

  // Method to trigger summary update
  private updateSummary() {
    this.salesArrayUpdateTrigger.update((v) => v + 1);
  }

  // Computed signal that maps platform names to their isOtherPlatform status
  // This ensures reactivity when platforms are loaded or when platform selection changes
  platformIsOtherPlatformMap = computed(() => {
    const allPlatforms = this.platforms();
    const map = new Map<number, boolean>();

    if (!allPlatforms || allPlatforms.length === 0) {
      return map;
    }

    allPlatforms.forEach((platform) => {
      map.set(platform.id, platform.isOtherPlatform ?? false);
    });

    return map;
  });

  async ngOnInit() {
    // Fetch platforms from API first - use a loader key to make it visible
    try {
      console.log('Fetching platforms...');
      const fetchedPlatforms = await this.platformService.fetchPlatforms({
        isInventoryPlatform: true,
      });
      this.platforms.set(
        fetchedPlatforms.sort((a, b) => {
          if (a.name === 'AMAZON') return -10;
          if (a.name === 'FLIPKART') return -9;
          if (!a.isEbookPlatform) return -2;
          return 1;
        }),
      );
      console.log(
        'Platforms fetched successfully:',
        fetchedPlatforms.length,
        'platforms',
      );
      // Update platformOptions for all existing groups after fetch
      await this.updateAllGroupsPlatformOptions();
    } catch (error) {
      console.error('Failed to fetch platforms:', error);
      // Try to use platforms from service if already cached
      const cachedPlatforms = this.platformService.platforms();
      if (cachedPlatforms && cachedPlatforms.length > 0) {
        this.platforms.set(cachedPlatforms);
        console.log(
          'Using cached platforms:',
          cachedPlatforms.length,
          'platforms',
        );
        // Update platformOptions for all existing groups after using cached
        await this.updateAllGroupsPlatformOptions();
      } else {
        console.warn('No platforms available - neither fetched nor cached');
      }
    }

    if (this.data.defaultTitles) {
      // Filter out titles where printingOnly is true
      const filteredTitles = this.data.defaultTitles.filter(
        (title) => !title.printingOnly,
      );
      this.titles.set(filteredTitles);
    }

    if (this.data.data?.length) {
      this.data.data.forEach((d) => {
        this.addSalesGroup(d.type as SalesType, d);
      });
    }

    this.fetchAndUpdateTitle();

    // Subscribe to form array changes to update summary
    this.form.controls.salesArray.valueChanges.subscribe(() => {
      this.updateSummary();
    });

    // Subscribe to quantity and amount changes in existing form groups
    this.form.controls.salesArray.controls.forEach((group, index) => {
      this.initializeTitleSearchForIndex(index);
      group.controls.quantity.valueChanges.subscribe(() => {
        this.updateSummary();
      });
      if (group.controls.amount) {
        group.controls.amount.valueChanges.subscribe(() => {
          this.updateSummary();
        });
      }
    });
  }
  selectSaleType(type: SalesType) {
    this.lastSelectedSaleType = type;
    this.addSalesGroup(type);
  }

  addSalesGroup(
    type: SalesType,
    data?: Partial<CreateSale & { availableTitles: number[] }>,
  ) {
    const newIndex = this.form.controls.salesArray.length;
    this.form.controls.salesArray.push(this.createSalesGroup(type, data));
    this.initializeTitleSearchForIndex(newIndex);
    this.updateSummary();
  }
  addMoreSales() {
    if (!this.lastSelectedSaleType) {
      Swal.fire({
        icon: 'warning',
        text: 'Please select a sale type first.',
        heightAuto: false,
      });
      return;
    }

    this.addSalesGroup(this.lastSelectedSaleType);
  }

  async fetchAndUpdateTitle(str?: string) {
    try {
      const { items } = await this.titleService.getTitles({
        searchStr: str,
        status: TitleStatus.APPROVED,
      });

      // ORIGINAL behavior
      const filteredItems = items.filter((title) => !title.printingOnly);

      // ✅ FIX: merge into main titles cache
      this.titles.update((existing) => {
        const map = new Map<number, Title>();
        (existing ?? []).forEach((t) => map.set(t.id, t));
        filteredItems.forEach((t) => map.set(t.id, t));
        return Array.from(map.values());
      });

      // ORIGINAL behavior
      this.filteredTitleOptions.forEach((_, index) => {
        this.updateTitleOptions(index);
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Update platformOptions for a group based on titleId
   */
  private async updatePlatformOptionsForGroup(
    group: FormGroup<CreateSaleForm>,
    titleId: number | null | undefined,
  ): Promise<void> {
    const platformOptionsArray = group.get('platformOptions') as FormArray<
      FormControl<Platform>
    >;

    const saleType = group.controls.type.value;

    // Clear existing options
    while (platformOptionsArray.length > 0) {
      platformOptionsArray.removeAt(0);
    }

    if (!titleId) {
      return;
    }

    const allPlatforms = this.platforms();
    if (!allPlatforms || allPlatforms.length === 0) {
      return;
    }

    // Find title in local cache first
    let title = this.titles()?.find((t) => t.id === Number(titleId));
    const ebooPlatofrm = allPlatforms.filter(
      ({ isEbookPlatform }) => isEbookPlatform,
    );
    const printPlatforms = allPlatforms.filter(
      ({ isEbookPlatform }) => !isEbookPlatform,
    );

    // Include all platforms that match publishing type
    // Inventory platforms are available for all sale types (they don't require pricing)
    [
      ...ebooPlatofrm.filter(
        () => title?.publishingType !== PublishingType.ONLY_PRINT,
      ),
      ...printPlatforms.filter(
        () => title?.publishingType !== PublishingType.ONLY_EBOOK,
      ),
    ]
      .filter(
        ({ isInventoryPlatform }) =>
          !isInventoryPlatform || saleType === SalesType.INVENTORY,
      )
      .sort((a, b) => {
        if (a.name === 'AMAZON' && b.name !== 'AMAZON') return -1;
        if (b.name === 'AMAZON' && a.name !== 'AMAZON') return 1;

        if (a.name === 'FLIPKART' && b.name !== 'FLIPKART') return -1;
        if (b.name === 'FLIPKART' && a.name !== 'FLIPKART') return 1;

        if (a.name === 'AMAZON_PRIME' && b.name !== 'AMAZON_PRIME') return -1;
        if (b.name === 'AMAZON_PRIME' && a.name !== 'AMAZON_PRIME') return 1;

        if (a.name === 'MAH_PRINT' && b.name !== 'MAH_PRINT') return -1;
        if (b.name === 'MAH_PRINT' && a.name !== 'MAH_PRINT') return 1;

        if (a.isEbookPlatform && !b.isEbookPlatform) return -1;
        if (!a.isEbookPlatform && b.isEbookPlatform) return 1;

        return 0;
      })
      .forEach((p) => {
        platformOptionsArray.push(
          new FormControl<Platform>(p, { nonNullable: true }),
        );
      });
  }

  /**
   * Update platformOptions for all existing groups
   */
  private async updateAllGroupsPlatformOptions(): Promise<void> {
    const promises = this.form.controls.salesArray.controls.map(
      async (group) => {
        const titleId = group.get('title.id')?.value;
        if (titleId) {
          await this.updatePlatformOptionsForGroup(group, titleId);
        }
      },
    );
    await Promise.all(promises);
  }

  updateAmountBasedOnPlatform(group: FormGroup, platform: string) {
    const saleType = group.get('type')?.value;
    const titleId = group.get('title.id')?.value;

    if (!titleId || !platform) {
      group.get('amount')?.patchValue(null);
      return;
    }

    // Check if the platform is an inventory platform
    const platformRecord = this.platforms().find((p) => p.name === platform);
    const isInventoryPlatform = platformRecord?.isInventoryPlatform ?? false;

    // For inventory platforms, don't try to get pricing - amount must be entered manually
    if (isInventoryPlatform) {
      // Don't auto-fill for inventory platforms, amount must be entered manually
      return;
    }

    const title = this.titles()?.find((t) => t.id === Number(titleId));
    if (!title) {
      group.get('amount')?.patchValue(null);
      return;
    }

    const p = title.pricing?.find((x) => x.platform === platform);
    if (!p) {
      group.get('amount')?.patchValue(null);
      return;
    }

    // For INVENTORY, allow manual entry, otherwise auto-fill from pricing
    if (saleType === 'INVENTORY') {
      // Don't auto-fill for inventory, but ensure field is enabled
      return;
    }

    // Auto-fill amount from pricing
    group.get('amount')?.patchValue(p.salesPrice);
  }
  createSalesGroup(
    type?: SalesType,
    data?: Partial<CreateSale & { availableTitles: number[] }>,
    groupIndex?: number,
  ) {
    let selectedTitle = data?.titleId;

    if (
      !selectedTitle &&
      data &&
      data.availableTitles &&
      data.availableTitles.length === 1
    ) {
      selectedTitle = data.availableTitles[0];
    }

    const group = new FormGroup<CreateSaleForm>({
      type: new FormControl(type || data?.type || undefined, {
        validators: [Validators.required],
        nonNullable: true,
      }),

      title: new FormGroup({
        id: new FormControl(selectedTitle || undefined, {
          validators: [Validators.required, Validators.min(1)],
          nonNullable: true,
        }),
        availableOptions: new FormControl<number[] | null | undefined>(
          data?.availableTitles,
        ),
      }),
      platformId: new FormControl(data?.platformId, {
        validators: [Validators.required],
        nonNullable: true,
      }),
      platformOptions: new FormArray<FormControl<Platform>>([]),

      platformName: new FormControl<string | undefined | null>(null, {
        validators: [],
        nonNullable: false,
      }),

      amount: new FormControl(data?.amount || null, {
        validators: [],
        nonNullable: true,
      }),

      quantity: new FormControl(data?.quantity || 1, {
        validators: [Validators.required, Validators.min(1)],
        nonNullable: true,
      }),

      delivery: new FormControl<CreateSale['delivery']>(data?.delivery || 0, {
        validators: [Validators.min(0)],
        nonNullable: true,
      }),

      soldAt: new FormControl<CreateSale['soldAt']>(
        data?.soldAt || new Date().toISOString(),
        { nonNullable: false },
      ),
    });
    // Update amount validators based on sale type
    group.get('type')?.valueChanges.subscribe((saleType) => {
      const amountControl = group.get('amount');
      if (saleType === 'INVENTORY') {
        amountControl?.setValidators([Validators.required, Validators.min(0)]);
      } else {
        amountControl?.setValidators([]);
        amountControl?.patchValue(null);
      }
      amountControl?.updateValueAndValidity();
    });

    // Initialize validators based on initial type
    const initialType = group.get('type')?.value;
    if (initialType === 'INVENTORY') {
      group
        .get('amount')
        ?.setValidators([Validators.required, Validators.min(0)]);
      group.get('amount')?.updateValueAndValidity();
    }

    // Subscribe to title changes and update platformOptions
    group.get('title.id')?.valueChanges.subscribe(async (titleId) => {
      group.patchValue({ platformId: null, amount: null, platformName: null });

      // Enable/disable platform control based on title selection
      const platformControl = group.get('platform');
      if (titleId) {
        platformControl?.enable();
      } else {
        platformControl?.disable();
      }

      // Calculate and set platformOptions
      await this.updatePlatformOptionsForGroup(group, titleId);

      // Update platform control validators based on available platforms
      const platformOptionsArray = group.get('platformOptions') as FormArray<
        FormControl<Platform>
      >;
      if (!platformOptionsArray || platformOptionsArray.length === 0) {
        group.get('platform')?.setValidators([]);
      } else {
        group.get('platform')?.setValidators([Validators.required]);
      }
      group.get('platform')?.updateValueAndValidity();
    });

    // Initialize platform control disabled state based on initial title
    const initialTitleId = group.get('title.id')?.value;
    const platformControl = group.get('platform');
    if (!initialTitleId) {
      platformControl?.disable();
    } else {
      platformControl?.enable();
    }

    // Initialize platformOptions if title is already set
    if (initialTitleId) {
      this.updatePlatformOptionsForGroup(group, initialTitleId);
    }

    // Initialize platformName validation if platform is already set
    const initialPlatform = group.get('platform')?.value;
    if (initialPlatform) {
      const platformRecord = this.platforms().find(
        (p) => p.name === initialPlatform,
      );
      const isOtherPlatform = platformRecord?.isOtherPlatform ?? false;
      const platformNameControl = group.get('platformName');
      if (isOtherPlatform) {
        platformNameControl?.setValidators([Validators.required]);
      } else {
        platformNameControl?.setValidators([]);
      }
      platformNameControl?.updateValueAndValidity();
    }

    group.get('platform')?.valueChanges.subscribe((platform) => {
      const saleType = group.get('type')?.value;
      const amountControl = group.get('amount');
      const platformNameControl = group.get('platformName');

      if (!platform) {
        group.patchValue({ amount: null, platformName: null });
        platformNameControl?.setValidators([]);
        platformNameControl?.updateValueAndValidity();
        return;
      }

      // Check if the platform is an inventory platform
      const platformRecord = this.platforms().find((p) => p.name === platform);
      const isInventoryPlatform = platformRecord?.isInventoryPlatform ?? false;
      const isOtherPlatform = platformRecord?.isOtherPlatform ?? false;

      // For other platforms, platformName is required
      if (isOtherPlatform) {
        platformNameControl?.setValidators([Validators.required]);
      } else {
        platformNameControl?.setValidators([]);
        platformNameControl?.patchValue(null);
      }
      platformNameControl?.updateValueAndValidity();

      // For inventory platforms, amount is required
      if (isInventoryPlatform) {
        amountControl?.setValidators([Validators.required, Validators.min(0)]);
        amountControl?.updateValueAndValidity();
        // Don't auto-fill amount for inventory platforms
        return;
      }

      // For INVENTORY sales type, amount is already required (handled in type subscription)
      // For other sales types on non-inventory platforms, auto-calculate from pricing
      if (saleType !== 'INVENTORY') {
        this.updateAmountBasedOnPlatform(group, platform);
      }
    });

    // Subscribe to quantity and amount changes for this new group
    group.controls.quantity.valueChanges.subscribe(() => {
      this.updateSummary();
    });
    if (group.controls.amount) {
      group.controls.amount.valueChanges.subscribe(() => {
        this.updateSummary();
      });
    }

    return group;
  }

  removeSale(index: number) {
    this.form.controls.salesArray.removeAt(index);
    this.cleanupTitleSearchForIndex(index);

    // Reindex remaining controls
    const currentControls = Array.from(this.titleSearchControls.keys()).sort();
    currentControls.forEach((oldIndex) => {
      if (oldIndex > index) {
        const titleControl = this.titleSearchControls.get(oldIndex);
        const titleOptions = this.filteredTitleOptions.get(oldIndex);
        const titleLoading = this.isSearchingTitles.get(oldIndex);

        if (titleControl)
          this.titleSearchControls.set(oldIndex - 1, titleControl);
        if (titleOptions)
          this.filteredTitleOptions.set(oldIndex - 1, titleOptions);
        if (titleLoading)
          this.isSearchingTitles.set(oldIndex - 1, titleLoading);

        this.cleanupTitleSearchForIndex(oldIndex);
      }
    });

    this.updateSummary();
  }

  private cleanupTitleSearchForIndex(index: number) {
    this.titleSearchControls.delete(index);
    this.filteredTitleOptions.delete(index);
    this.isSearchingTitles.delete(index);
  }

  private initializeTitleSearchForIndex(index: number) {
    // Create search control for this index
    const titleSearchControl = new FormControl<string | null>('');
    this.titleSearchControls.set(index, titleSearchControl);

    // Create filtered options signal
    this.filteredTitleOptions.set(
      index,
      signal<{ label: string; value: number }[]>([]),
    );

    // Create loading signal
    this.isSearchingTitles.set(index, signal(false));

    // Setup subscription
    titleSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.searchTitles(searchTerm.trim(), index);
        } else {
          this.updateTitleOptions(index);
        }
      });

    // Initialize options
    this.updateTitleOptions(index);
  }

  private updateTitleOptions(index: number) {
    const titles = this.titles();
    const signal = this.filteredTitleOptions.get(index);
    if (!signal) return;

    if (!titles) {
      signal.set([]);
      return;
    }

    const searchControl = this.titleSearchControls.get(index);
    const searchValue = (searchControl?.value || '').toLowerCase();
    const saleGroup = this.form.controls.salesArray.at(index);
    const availableOptions = saleGroup?.get('title.availableOptions')?.value;

    let filtered = titles
      .filter((title) => {
        // Filter by search term
        const matchesSearch = title.name.toLowerCase().includes(searchValue);
        // Filter by available options if set
        const matchesAvailable =
          !availableOptions ||
          availableOptions.length === 0 ||
          availableOptions.includes(title.id);
        return matchesSearch && matchesAvailable;
      })
      .map((title) => ({
        label:
          title.name +
          (title.publisher ? `(${title.publisher.name})` : '') +
          (title.skuNumber ? `(${title.skuNumber})` : ''),
        value: title.id,
      }));

    signal.set(filtered);
  }

  private async searchTitles(searchTerm: string, index: number) {
    const loadingSignal = this.isSearchingTitles.get(index);
    const filteredSignal = this.filteredTitleOptions.get(index);

    if (!loadingSignal || !filteredSignal) return;

    loadingSignal.set(true);

    try {
      const { items } = await this.titleService.getTitles({
        searchStr: searchTerm,
        status: TitleStatus.APPROVED,
      });

      // ORIGINAL behavior: remove printing-only titles
      const filteredItems = items.filter((title) => !title.printingOnly);

      // ✅ FIX (ADD ONLY):
      // Merge searched titles into the main titles source
      // so selected options never disappear from mat-select
      this.titles.update((existing) => {
        const map = new Map<number, Title>();

        (existing ?? []).forEach((t) => map.set(t.id, t));
        filteredItems.forEach((t) => map.set(t.id, t));

        return Array.from(map.values());
      });

      const saleGroup = this.form.controls.salesArray.at(index);
      const availableOptions = saleGroup?.get('title.availableOptions')?.value;

      // ORIGINAL option building logic
      const options = filteredItems
        .filter((title) => {
          return (
            !availableOptions ||
            availableOptions.length === 0 ||
            availableOptions.includes(title.id)
          );
        })
        .map((title) => ({
          label:
            title.name +
            (title.publisher ? `(${title.publisher.name})` : '') +
            (title.skuNumber ? `(${title.skuNumber})` : ''),
          value: title.id,
        }));

      filteredSignal.set(options);
    } catch (error) {
      console.error('Error searching titles:', error);
      this.updateTitleOptions(index);
    } finally {
      loadingSignal.set(false);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    if (this.form.valid) {
      const data: CreateSale[] = this.form.controls.salesArray.controls.map(
        (group) => {
          const {
            controls: {
              amount,
              delivery,
              platformId,
              quantity,
              soldAt,
              title,
              type,
            },
          } = group;
          const saleData: CreateSale = {
            delivery: Number(delivery.value) || 0,
            quantity: Number(quantity.value) || 1,
            titleId: Number(title.value.id),
            soldAt: format(soldAt.value || new Date(), 'yyyy-MM-dd'),
            platformId: platformId.value!,
            type: type.value as SalesType,
          };

          // Include amount for INVENTORY sales or inventory platforms
          const platformRecord = this.platforms().find(
            (p) => p.id === platformId.value,
          );
          const isInventoryPlatform =
            platformRecord?.isInventoryPlatform ?? false;

          if (type.value === 'INVENTORY' || isInventoryPlatform) {
            saleData.amount = Number(amount.value || 0) || 0;
          }

          // Include platformName for other platforms
          const platformNameValue = group.get('platformName')?.value;
          if (platformNameValue) {
            saleData.platformName = platformNameValue;
          }

          return saleData;
        },
      );

      this.data.onSubmit(data);
    }
  }
}

interface Inputs {
  data?: Partial<CreateSale & { availableTitles: number[] }>[];
  defaultTitles?: Title[];
  onClose: () => void;
  onSubmit: (data: CreateSale[]) => void;
}
