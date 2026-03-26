import {
  Component,
  input,
  computed,
  inject,
  output,
  OnInit,
  OnDestroy,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
  AbstractControl,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PlatformService } from '../../../../services/platform';
import { StaticValuesService } from '../../../../services/static-values';
import { RoyaltyService } from '../../../../services/royalty-service';
import {
  Author,
  PlatForm,
  PricingGroup,
  Publishers,
  PublishingType,
  PricingCreate,
  UpdateRoyalty,
} from '../../../../interfaces';
import { TitleService } from '../../../titles/title-service';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-add-title-pricing-royalty',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, MatIconModule],
  templateUrl: './add-title-pricing-royalty.html',
  styleUrl: './add-title-pricing-royalty.css',
})
export class AddTitlePricingRoyalty implements OnInit, OnDestroy {
  // Inputs from parent component
  pricingControls = input.required<FormArray<PricingGroup>>();
  authorRoyalties = input.required<
    FormArray<
      FormGroup<{
        authorId: FormControl<number | null>;
        percentage: FormControl<number | null>;
      }>
    >
  >();

  // Pricing context inputs
  msp = input.required<number>();
  printingPrice = input.required<number>();
  customPrintCost = input<number | null>(null);
  publishingType = input.required<string>();

  // Entity context
  authors = input.required<Author[]>();
  publisher = input<Publishers | null>(null);

  // Application context
  accessLevel = input.required<string>();
  titleId = input<number | null>(null);
  titleStatus = input<string | null>(null);

  // Outputs
  pricingSaved = output<void>();

  private readonly platformService = inject(PlatformService);
  private readonly staticValueService = inject(StaticValuesService);
  private readonly royaltyService = inject(RoyaltyService);
  private readonly titleService = inject(TitleService);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  PublishingType = PublishingType;

  // Use Angular 18 computed signals
  ebookMsp = computed(
    () =>
      Number((this.staticValueService.staticValues() as any)?.EBOOK_MSP) || 69,
  );

  totalAuthorsPercent = signal<number>(0);

  publisherPercentage = computed(() => {
    return Math.max(0, 100 - this.totalAuthorsPercent());
  });

  isRaisingTicket = input.required<boolean>();

  // platformName -> { percentageString: calculatedAmount }
  royaltyValues = signal<Record<string, Record<string, number>>>({});

  isCalculatingRoyalties = signal<boolean>(false);

  get visiblePricingControls() {
    const controls = this.pricingControls().controls;

    // Filter controls based on access level
    if (this.accessLevel() === 'SUPERADMIN' || this.accessLevel() === 'ADMIN') {
      return controls;
    }

    // Non-admins shouldn't see Admin Only platforms
    return controls.filter(
      (control) =>
        !this.platformService
          .platforms()
          .find((p) => p.name === control.controls.platform.value)
          ?.isSuperAdminPricingOnly,
    );
  }

  constructor() {
    effect(() => {
      const currentAuthors = this.authors();
      const formArray = this.authorRoyalties();

      const isAuthorAddedOrRemoved = formArray.length !== currentAuthors.length;

      // Keep existing percentages
      const existingMap = new Map<number, number>();
      formArray.controls.forEach((ctrl) => {
        const val = ctrl.getRawValue();
        if (val.authorId) {
          existingMap.set(val.authorId, val.percentage ?? 0);
        }
      });

      formArray.clear({ emitEvent: false });

      const defaultPercent = currentAuthors.length === 1 ? 100 : 50;

      formArray.clear({ emitEvent: false });

      currentAuthors.forEach((author) => {
        if (author.id) {
          const pct = isAuthorAddedOrRemoved
            ? defaultPercent
            : (existingMap.get(author.id) ?? defaultPercent);
          formArray.push(
            new FormGroup({
              authorId: new FormControl<number | null>(author.id),
              percentage: new FormControl<number | null>(pct, [
                Validators.required,
                Validators.min(0),
                Validators.max(100),
              ]),
            }),
            { emitEvent: false },
          );
        }
      });

      // Update the reactive signal manually after bulk change
      this.updateTotalAuthorsPercent();
      formArray.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit() {
    this.setupPricingSyncing();

    // Listen to controls changes (like when prefilled) to attach listeners
    this.pricingControls()
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.setupPricingSyncing();
      });

    // Subscribe to royalty changes so the publisher percentage updates reactively in the UI
    this.authorRoyalties()
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateTotalAuthorsPercent();
      });
    this.updateTotalAuthorsPercent();

    // Set loading state immediately on changes
    this.pricingControls()
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isCalculatingRoyalties.set(true);
      });
      
    // Trigger API calculation on changes
    this.pricingControls()
      .valueChanges.pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('prceee');
        this.updateRoyaltyAmounts();
      });

    this.authorRoyalties()
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isCalculatingRoyalties.set(true);
      });
      
    this.authorRoyalties()
      .valueChanges.pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateRoyaltyAmounts();
      });

    // Initial calculation
    this.isCalculatingRoyalties.set(true);
    this.updateRoyaltyAmounts();
  }

  private updateTotalAuthorsPercent() {
    let sum = 0;
    this.authorRoyalties().getRawValue().forEach(
      (v: any) => (sum += Number(v.percentage) || 0),
    );
    this.totalAuthorsPercent.set(sum);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getAuthorName(id: number): string {
    const author = this.authors().find((a) => a.id === id);
    if (!author) return 'N/A';
    if (author.name) return author.name;
    const user = (author as any).user;
    return user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'
      : 'N/A';
  }

  private attachedPricingControls = new Set<AbstractControl>();

  private setupPricingSyncing() {
    // When isSameAsMrp changes, update sales price or enable/disable
    this.pricingControls().controls.forEach((control) => {
      if (this.attachedPricingControls.has(control)) return;
      this.attachedPricingControls.add(control);

      control.controls.isSameAsMrp.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((isSame: any) => {
          if (isSame) {
            control.controls.salesPrice.setValue(control.controls.mrp.value);
            control.controls.salesPrice.disable({ emitEvent: false });
          } else {
            control.controls.salesPrice.enable({ emitEvent: false });
          }
        });

      control.controls.mrp.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((mrp: number) => {
          console.log({ mrp });

          if (control.controls.isSameAsMrp.value) {
            control.controls.salesPrice.setValue(mrp, { emitEvent: false });
          }
        });
    });
  }

  private async updateRoyaltyAmounts() {
    const pricingData = this.pricingControls().getRawValue();
    const authorPcts = this.authorRoyalties().getRawValue();
    const pubPercent = this.publisherPercentage();

    const apiItems: any[] = [];
    const percentages = new Set<string>();

    authorPcts.forEach((a) => {
      if (a.percentage != null) percentages.add(a.percentage.toString());
    });
    percentages.add(pubPercent.toString());

    pricingData.forEach((p: any) => {
      if (p.platform && p.salesPrice > 0) {
        const platformId = this.platformService
          .platforms()
          .find((pl) => pl.name === p.platform)?.id;
        if (platformId) {
          apiItems.push({
            platformId,
            price: p.salesPrice,
            division: Array.from(percentages)
              .map(Number)
              .sort((a, b) => a - b)
              .map(String),
          });
        }
      }
    });

    if (apiItems.length === 0) {
      this.isCalculatingRoyalties.set(false);
      return;
    }

    try {
      const response = await this.royaltyService.calculateRoyalties({
        items: apiItems,
        printingPrice: this.customPrintCost() || this.printingPrice() || 0,
      });

      const newValues: Record<string, Record<string, number>> = {};

      response.divisionValue.forEach((item) => {
        const platformName = this.platformService
          .platforms()
          .find((p) => p.id === item.platformId)?.name;
        if (platformName) {
          newValues[platformName] = item.divisionValue;

          // Add publisher margin logic for print platforms
          if (this.publisher() && !this.isEbookPlatform(platformName)) {
            const actualPrintCost = this.printingPrice() || 0;
            const chargedPrintCost = this.customPrintCost();
            if (
              chargedPrintCost !== null &&
              chargedPrintCost > actualPrintCost
            ) {
              const pubPercentStr = this.publisherPercentage().toString();
              if (newValues[platformName][pubPercentStr] !== undefined) {
                newValues[platformName][pubPercentStr] +=
                  chargedPrintCost - actualPrintCost;
              } else {
                newValues[platformName][pubPercentStr] =
                  chargedPrintCost - actualPrintCost;
              }
            }
          }
        }
      });

      this.royaltyValues.set(newValues);
    } catch (error) {
      console.error('Error updating royalty amounts:', error);
    } finally {
      this.isCalculatingRoyalties.set(false);
    }
  }

  calculateRoyaltyAmount(
    platform: string,
    entityId: number | string,
    isPublisher: boolean,
  ): number {
    let percent = 0;
    if (isPublisher) {
      percent = this.publisherPercentage();
    } else {
      const authorCtrl = this.authorRoyalties().controls.find(
        (c) => c.getRawValue().authorId === entityId,
      );
      percent = authorCtrl ? authorCtrl.getRawValue().percentage || 0 : 0;
    }

    const platformValues = this.royaltyValues()[platform];
    if (platformValues) {
      return platformValues[percent.toString()] || 0;
    }

    // Fallback: local calculation if API result not yet available
    const pricing = this.pricingControls().controls.find(
      (p: any) => p.controls.platform.value === platform,
    );
    if (!pricing) return 0;
    const salesPrice = pricing.controls.salesPrice.value || 0;
    return (salesPrice * percent) / 100;
  }

  getTotalAuthorPercentages(): number {
    return this.totalAuthorsPercent();
  }

  getPlatformMsp(platformName: string): number {
    const platform = this.platformService.getPlatformByName(platformName);
    if (platform?.isEbookPlatform) return this.ebookMsp();
    return this.msp();
  }

  isSuperAdminPricingOnly(platformName: string): boolean {
    return (
      this.platformService.getPlatformByName(platformName)
        ?.isSuperAdminPricingOnly ?? false
    );
  }

  isEbookPlatform(platformName: string): boolean {
    return (
      this.platformService.getPlatformByName(platformName)?.isEbookPlatform ??
      false
    );
  }

  isSalesPriceSameAsMrp(item: any): boolean {
    return !!item.controls.isSameAsMrp.value;
  }

  shouldShowRoyaltyNA(platformName: string): boolean {
    const pricing = this.pricingControls().controls.find(
      (p: any) => p.controls.platform.value === platformName,
    );
    return !(pricing && pricing.controls.salesPrice.value > 0);
  }

  areFormsValid(): boolean {
    return this.pricingControls().valid && this.authorRoyalties().valid;
  }

  // Used only for the "Save and Next" button in the template
  async onSavePricingDetails() {
    this.pricingControls().markAllAsTouched();
    this.authorRoyalties().markAllAsTouched();

    if (this.pricingControls().invalid || this.authorRoyalties().invalid) {
      await new Promise((r) => setTimeout(r, 100));
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error') || 'Error',
        text:
          this.translateService.instant('pleaseresolveallformerrors') ||
          'Please resolve all form errors.',
      });
      return;
    }

    const pricingData: PricingCreate[] = [];
    const isOnlyEbook = this.publishingType() === PublishingType.ONLY_EBOOK;
    const isOnlyPrint = this.publishingType() === PublishingType.ONLY_PRINT;

    this.pricingControls().controls.forEach((ctrl) => {
      const val = ctrl.getRawValue();
      if (val.platform && val.salesPrice > 0) {
        const platformId = this.platformService.getPlatformByName(
          val.platform,
        )?.id;
        if (platformId) {
          pricingData.push({
            id: val.id ?? undefined,
            platformId,
            mrp: val.mrp,
            salesPrice: val.salesPrice,
          } as PricingCreate);
        }
      }
    });

    if (!pricingData.length && this.accessLevel() !== 'SUPERADMIN') {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning') || 'Warning',
        text:
          this.translateService.instant('invalidpricingdata') ||
          'Please provide valid pricing data for available platforms.',
      });
      return;
    }

    const royaltiesMap = new Map<string, UpdateRoyalty>();
    const authorsCtrl = this.authorRoyalties().controls;
    const pubPercent = this.publisherPercentage();
    const publisherId = this.publisher()?.id;

    this.pricingControls().controls.forEach((ctrl) => {
      const platformName = ctrl.value.platform;
      if (!platformName) return;

      const platformObj = this.platformService.getPlatformByName(platformName);
      if (!platformObj) return;

      if (isOnlyEbook && !platformObj.isEbookPlatform) return;
      if (isOnlyPrint && platformObj.isEbookPlatform) return;

      const addRoyalty = (
        authorId: number | null | undefined,
        pId: number | null | undefined,
        percentage: number,
      ) => {
        const key = authorId
          ? `author_${authorId}_${platformObj.id}`
          : `publisher_${pId}_${platformObj.id}`;

        royaltiesMap.set(key, {
          platformId: platformObj.id,
          percentage: Number(percentage),
          authorId: authorId ?? undefined,
          publisherId: pId ?? undefined,
        } as UpdateRoyalty);
      };

      authorsCtrl.forEach((authCtrl) => {
        const aId = authCtrl.value.authorId;
        const pct = authCtrl.value.percentage;
        if (aId && pct != null) {
          addRoyalty(aId, undefined, pct as number);
        }
      });

      if (publisherId && pubPercent !== null) {
        addRoyalty(undefined, publisherId, pubPercent);
      }
    });

    const royalties: UpdateRoyalty[] = Array.from(royaltiesMap.values());

    if (!royalties.length) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning') || 'Warning',
        text:
          this.translateService.instant('invalidroyaltiesdata') ||
          'Please provide valid royalties.',
      });
      return;
    }

    try {
      if (this.isRaisingTicket()) {
        const hasChanges =
          this.pricingControls().dirty || this.authorRoyalties().dirty;
        if (!hasChanges) {
          this.pricingSaved.emit();
          // await Swal.fire({
          //   icon: 'error',
          //   title: this.translateService.instant('error') || 'Error',
          //   text:
          //     this.translateService.instant('nochangesdetected') ||
          //     'No changes detected. Please make changes before raising a ticket.',
          //   heightAuto: false,
          // });
          return;
        }

        const tId = this.titleId();
        if (tId) {
          await this.titleService.createPricingUpdateTicket(tId, {
            data: pricingData,
          });

          await this.titleService.createRoyaltyUpdateTicket(tId, {
            royalties,
          });
        }

        await Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success') || 'Success',
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        this.pricingSaved.emit();
        // this.router.navigate(['/titles']);
        return;
      }

      const tId = this.titleId();
      if (tId) {
        await this.titleService.createManyPricing(pricingData, tId);
        await this.titleService.createManyRoyalties(royalties, tId);
      }

      // Reset dirty status
      this.pricingControls().markAsPristine();
      this.authorRoyalties().markAsPristine();

      this.pricingSaved.emit();
    } catch (error: any) {
      console.error('Error saving pricing and royalties:', error);
    }
  }
}
