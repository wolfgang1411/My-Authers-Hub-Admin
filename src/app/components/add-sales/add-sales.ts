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
    TitleFilterBySale,
    MatButtonModule,
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

  ngOnInit() {
    if (this.data.defaultTitles) {
      this.titles.set(this.data.defaultTitles);
    }

    if (this.data.data?.length) {
      this.data.data.forEach((d) => {
        this.addSalesGroup(d.type as SalesType, d);
      });
    }

    this.fetchAndUpdateTitle();
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

      this.titles.update((titles) => {
        const result = [...(titles || []), ...items].reduce(
          (a, b) => (a.map(({ id }) => id).includes(b.id) ? a : [...a, b]),
          Array<Title>()
        );
        return result;
      });
    } catch (error) {
      console.log(error);
    }
  }

  updateAmountBasedOnPlatform(group: FormGroup, platform: string) {
    const saleType = group.get('type')?.value;
    if (saleType === 'INVENTORY') return;

    const titleId = group.get('title.id')?.value;
    if (!titleId || !platform) return;

    const title = this.titles()?.find((t) => t.id === Number(titleId));
    if (!title) return;

    const p = title.pricing?.find((x) => x.platform === platform);
    if (!p) return;
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

      amount: new FormControl(data?.amount, {
        validators: [Validators.required, Validators.min(1)],
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
    group.get('title.id')?.valueChanges.subscribe(() => {
      group.patchValue({ platform: null, amount: null });
    });
    group.get('platform')?.valueChanges.subscribe((platform) => {
      if (platform) {
        this.updateAmountBasedOnPlatform(group, platform);
      }
    });

    return group;
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
          return {
            amount: Number(amount.value),
            delivery: Number(delivery.value) || 0,
            quantity: Number(quantity.value) || 1,
            titleId: Number(title.value.id),
            soldAt: format(soldAt.value || new Date(), 'yyyy-MM-dd'),
            platform: platform.value as PlatForm,
            type: type.value as SalesType,
          };
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
