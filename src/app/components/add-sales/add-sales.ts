import {
  Component,
  computed,
  inject,
  OnInit,
  Pipe,
  PipeTransform,
  signal,
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
} from '../../interfaces';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TitleService } from '../../pages/titles/title-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { StaticValuesService } from '../../services/static-values';
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
    TitleFilterBySale,
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
  ],

  templateUrl: './add-sales.html',
  styleUrl: './add-sales.css',
})
export class AddSales implements OnInit {
  constructor(
    private titleService: TitleService,
    private staticValueService: StaticValuesService
  ) {}

  data = inject<Inputs>(MAT_DIALOG_DATA);
  form = new FormGroup({
    salesArray: new FormArray<FormGroup<CreateSaleForm>>([]),
  });

  lastSelectedSaleType: SalesType | null = null;
  salesTypes = SalesType;
  salesType = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.SalesType || {}
    ) as SalesType[];
  });

  platforms = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.PlatForm || {}
    ) as PlatForm[];
  });

  titles = signal<Title[] | null>(null);

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

  ngOnInit() {
    if (this.data.defaultTitles) {
      // Filter out titles where printingOnly is true
      const filteredTitles = this.data.defaultTitles.filter(
        (title) => !title.printingOnly
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
    this.form.controls.salesArray.controls.forEach((group) => {
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
    data?: Partial<CreateSale & { availableTitles: number[] }>
  ) {
    this.form.controls.salesArray.push(this.createSalesGroup(type, data));
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
      const { items } = await this.titleService.getTitles({ searchStr: str });

      // Filter out titles where printingOnly is true
      const filteredItems = items.filter((title) => !title.printingOnly);

      this.titles.update((titles) => {
        const result = [...(titles || []), ...filteredItems].reduce(
          (a, b) => (a.map(({ id }) => id).includes(b.id) ? a : [...a, b]),
          Array<Title>()
        );
        return result;
      });
    } catch (error) {
      console.log(error);
    }
  }

  getAvailablePlatformsForTitle(
    titleId: number | null | undefined
  ): PlatForm[] {
    if (!titleId) return [];

    const title = this.titles()?.find((t) => t.id === Number(titleId));
    if (!title) return [];

    const publishingType = title.publishingType;
    const isOnlyEbook = publishingType === PublishingType.ONLY_EBOOK;
    const isOnlyPrint = publishingType === PublishingType.ONLY_PRINT;

    const ebookPlatforms: PlatForm[] = [
      PlatForm.MAH_EBOOK,
      PlatForm.KINDLE,
      PlatForm.GOOGLE_PLAY,
    ];
    const printPlatforms: PlatForm[] = [
      PlatForm.AMAZON,
      PlatForm.FLIPKART,
      PlatForm.MAH_PRINT,
    ];

    // Get platforms that have pricing data
    const availablePlatforms = title.pricing
      ?.map((p) => p.platform)
      .filter((platform) => platform !== null && platform !== undefined) as
      | PlatForm[]
      | undefined;

    if (!availablePlatforms || !availablePlatforms.length) return [];

    // Filter based on publishing type
    if (isOnlyEbook) {
      return availablePlatforms.filter((platform) =>
        ebookPlatforms.includes(platform)
      );
    } else if (isOnlyPrint) {
      return availablePlatforms.filter((platform) =>
        printPlatforms.includes(platform)
      );
    }

    // For PRINT_EBOOK, return all available platforms
    return availablePlatforms;
  }

  updateAmountBasedOnPlatform(group: FormGroup, platform: string) {
    const saleType = group.get('type')?.value;
    const titleId = group.get('title.id')?.value;

    if (!titleId || !platform) {
      group.get('amount')?.patchValue(null);
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
    data?: Partial<CreateSale & { availableTitles: number[] }>
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
          data?.availableTitles
        ),
      }),

      platform: new FormControl(data?.platform, {
        validators: [Validators.required],
        nonNullable: true,
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
        { nonNullable: false }
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

    group.get('title.id')?.valueChanges.subscribe(() => {
      group.patchValue({ platform: null, amount: null });
      // Update platform control validators based on available platforms
      const availablePlatforms = this.getAvailablePlatformsForTitle(
        group.get('title.id')?.value
      );
      if (!availablePlatforms.length) {
        group.get('platform')?.setValidators([]);
      } else {
        group.get('platform')?.setValidators([Validators.required]);
      }
      group.get('platform')?.updateValueAndValidity();
    });
    group.get('platform')?.valueChanges.subscribe((platform) => {
      // Only update amount for non-INVENTORY sales (auto-calculate)
      const saleType = group.get('type')?.value;
      if (platform && saleType !== 'INVENTORY') {
        this.updateAmountBasedOnPlatform(group, platform);
      } else if (!platform) {
        group.patchValue({ amount: null });
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
    this.updateSummary();
  }

  onSubmit() {
    if (this.form.valid) {
      const data: CreateSale[] = this.form.controls.salesArray.controls.map(
        ({
          controls: {
            amount,
            delivery,
            platform,
            quantity,
            soldAt,
            title,
            type,
          },
        }) => {
          const saleData: CreateSale = {
            delivery: Number(delivery.value) || 0,
            quantity: Number(quantity.value) || 1,
            titleId: Number(title.value.id),
            soldAt: format(soldAt.value || new Date(), 'yyyy-MM-dd'),
            platform: platform.value as PlatForm,
            type: type.value as SalesType,
          };

          // Only include amount for INVENTORY sales
          if (type.value === 'INVENTORY' && amount.value) {
            saleData.amount = Number(amount.value);
          }

          return saleData;
        }
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
