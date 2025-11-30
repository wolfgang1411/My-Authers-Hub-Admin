import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import {
  CalculateRoyaltiesRequest,
  CalculateRoyaltiesResponse,
  RoyaltyService,
} from '../../services/royalty-service';
import { PlatformService } from '../../services/platform';
import { Platform } from '../../interfaces/Platform';
import { SharedModule } from '../../modules/shared/shared-module';
import { PlatformDialog } from '../platform-dialog/platform-dialog';
import { UserService } from '../../services/user';
import { InputError } from 'src/app/directives/input-error';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

type RoyaltyItemForm = FormGroup<{
  platform: FormControl<string>;
  price: FormControl<number | null>;
  division: FormControl<string>;
}>;

@Component({
  selector: 'app-royalty-calculator-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    InputError,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './royalty-calculator-settings.html',
  styleUrl: './royalty-calculator-settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoyaltyCalculatorSettings implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly royaltyService = inject(RoyaltyService);
  private readonly platformService = inject(PlatformService);
  private readonly dialog = inject(MatDialog);
  private readonly userService = inject(UserService);

  protected readonly platforms = computed(() =>
    this.platformService.platforms()
  );
  protected readonly isSuperAdmin = computed(
    () => this.userService.loggedInUser$()?.accessLevel === 'SUPERADMIN'
  );
  protected readonly resultDivision = signal<
    CalculateRoyaltiesResponse['divisionValue']
  >([]);
  protected readonly isCalculating = signal(false);
  protected readonly lastCalculatedItems = signal<
    CalculateRoyaltiesRequest['items']
  >([]);

  protected readonly calculatorForm = this.fb.group({
    printingPrice: this.fb.control<number | null>(null, [Validators.min(0)]),
    items: this.fb.array<RoyaltyItemForm>([this.createItemGroup()]),
  });

  get royaltyItems(): FormArray<RoyaltyItemForm> {
    return this.calculatorForm.get('items') as FormArray<RoyaltyItemForm>;
  }

  isSubmitted: boolean = false;

  async ngOnInit() {
    if (!this.platforms().length) {
      await this.platformService.fetchPlatforms().catch(() => undefined);
    } else {
      this.platformService.fetchPlatforms().catch(() => undefined);
    }
  }

  validateMRP(index: number): void {
    const item = this.royaltyItems.at(index);
    if (!item) return;

    const selectedPlatform = item.get('platform')?.value;
    const enteredMRP = item.get('price')?.value as number;
    const printingCost = this.calculatorForm.get('printingPrice')
      ?.value as number;

    const platform = this.platforms()?.find((p) => p.name === selectedPlatform);
    if (!platform) return;

    if (platform.isEbookPlatform) {
      item.get('price')?.setErrors(null);
      return;
    }

    if (enteredMRP < printingCost) {
      item.get('price')?.setErrors({ invalidMRP: true });
    } else {
      item.get('price')?.setErrors(null);
    }
  }

  addItem() {
    this.royaltyItems.push(this.createItemGroup());
  }

  removeItem(index: number) {
    if (this.royaltyItems.length === 1) {
      this.royaltyItems.at(0).setValue({
        platform: '',
        price: null,
        division: '',
      });
      return;
    }
    this.royaltyItems.removeAt(index);
  }

  async onCalculate() {
    this.isSubmitted = true;
    if (this.calculatorForm.invalid) {
      this.calculatorForm.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    if (!payload.items.length) {
      Swal.fire({
        icon: 'info',
        title: 'Missing data',
        text: 'Add at least one platform row with division values.',
      });
      return;
    }

    this.isCalculating.set(true);
    try {
      const response = await this.royaltyService.calculateRoyalties(payload);
      this.resultDivision.set(response.divisionValue);
      this.lastCalculatedItems.set(payload.items);
    } finally {
      this.isCalculating.set(false);
    }
  }

  onAddPlatform() {
    const dialogRef = this.dialog.open(PlatformDialog, {
      width: '600px',
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Platform was saved, refresh the list
        this.platformService.fetchPlatforms().catch(() => undefined);
      }
    });
  }

  onEditPlatform(platform: Platform) {
    const dialogRef = this.dialog.open(PlatformDialog, {
      width: '600px',
      data: platform,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Platform was saved, refresh the list
        this.platformService.fetchPlatforms().catch(() => undefined);
      }
    });
  }

  protected divisionEntries(record: Record<string, number>) {
    return Object.entries(record || {});
  }

  protected divisionRows(
    platform: string,
    divisionValue: Record<string, number>
  ) {
    const requestItem = this.lastCalculatedItems().find(
      (item) => item.platform === platform
    );
    const divisions = requestItem?.division ?? Object.keys(divisionValue);

    return divisions.map((percentage, index) => ({
      id: `${platform}-${percentage}-${index}`,
      percentage,
      amount: divisionValue[percentage] ?? 0,
    }));
  }

  private createItemGroup(): RoyaltyItemForm {
    return new FormGroup({
      platform: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      price: new FormControl<number | null>(null, {
        validators: [Validators.required],
      }),
      division: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  private buildPayload(): CalculateRoyaltiesRequest {
    const printingPrice = Number(
      this.calculatorForm.get('printingPrice')?.value || 0
    );

    const items = this.royaltyItems.controls
      .map((control) => {
        const value = control.getRawValue();
        return {
          platform: value.platform,
          price: Number(value.price),
          division: this.parseDivision(value.division),
        };
      })
      .filter((item) => item.division.length);

    return {
      printingPrice,
      items,
    };
  }

  private parseDivision(raw: string | null | undefined) {
    if (!raw) {
      return [];
    }

    return raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '');
  }
}
