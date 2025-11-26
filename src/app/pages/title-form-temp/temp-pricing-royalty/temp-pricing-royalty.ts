import {
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  OnInit,
  runInInjectionContext,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';
import {
  Author,
  PlatForm,
  PricingGroup,
  Publishers,
  AccessLevel,
  PublishingType,
  Platform,
} from '../../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { RoyaltyFormGroup } from '../../../interfaces/Royalty';
import { combineLatest, debounceTime, Subject, takeUntil } from 'rxjs';
import { StaticValuesService } from '../../../services/static-values';
import { PlatformService } from '../../../services/platform';
import { RoyaltyService } from '../../../services/royalty-service';

@Component({
  selector: 'app-temp-pricing-royalty',
  imports: [
    SharedModule,
    MatIconModule,
    ReactiveFormsModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './temp-pricing-royalty.html',
  styleUrl: './temp-pricing-royalty.css',
})
export class TempPricingRoyalty implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly injector = inject(Injector);
  protected readonly PublishingType = PublishingType;

  constructor(
    private staticValueService: StaticValuesService,
    private platformService: PlatformService,
    private royaltyService: RoyaltyService
  ) {}

  // Pricing inputs
  pricingControls = input.required<FormArray<PricingGroup>>();
  msp = input.required<number>();
  printingPrice = input.required<number | null>();
  customPrintCost = input<number | null>(null);
  accessLevel = input<AccessLevel | null>(null);
  publishingType = input<PublishingType | null>(null);

  // Royalty inputs
  royaltiesController =
    input.required<FormArray<FormGroup<RoyaltyFormGroup>>>();
  authors = input.required<Author[]>();
  publisher = input.required<Publishers | null>();

  // Computed properties
  ebookMsp = computed(() => {
    return Number(this.staticValueService.staticValues()?.EBOOK_MSP);
  });

  displayedColumns = computed(() => {
    const allPlatforms = this.platformService.platforms();
    const publishingType = this.publishingType();

    if (!allPlatforms.length) {
      return [];
    }

    if (publishingType === PublishingType.ONLY_EBOOK) {
      // For ebook-only titles, only show ebook platforms
      return allPlatforms.filter((p) => p.type === 'EBOOK').map((p) => p.name);
    }

    if (publishingType === PublishingType.ONLY_PRINT) {
      // For print-only titles, only show print platforms
      return allPlatforms.filter((p) => p.type === 'PRINT').map((p) => p.name);
    }

    // For PRINT_EBOOK, show all platforms
    return allPlatforms.map((p) => p.name);
  });

  // Author percentage form controls (one per author)
  authorPercentageControls = signal<Map<number, FormControl<number | null>>>(
    new Map()
  );

  // Publisher percentage (calculated automatically)
  publisherPercentage = signal<number>(0);

  // Total royalties per platform (using platform names)
  totalRoyalties = signal<Partial<Record<string, number>>>({});

  // Royalty amount calculations (using platform names)
  totalRoyaltiesAmount = signal<
    Record<string, Partial<Record<string, number>> | undefined>
  >({});

  // Extra margin from custom print cost (only for publishers on print platforms)
  publisherExtraMargin = signal<Partial<Record<string, number>>>({});

  async ngOnInit() {
    // Fetch platforms from API
    try {
      await this.platformService.fetchPlatforms();
    } catch (error) {
      console.error('Failed to fetch platforms:', error);
    }

    // Setup reactive calculations first
    this.calculateTotalRoyalties();
    this.calculateRoyaltyAmountPerPerson();

    // Initialize author percentage controls from existing royalties
    this.initializeAuthorPercentageControls();

    // Watch FormArray changes to detect when royalties are added
    // This is crucial for detecting when royalties are prefilled from server
    this.royaltiesController()
      .valueChanges.pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => {
        // When royalties change, recalculate publisher percentage
        const publisher = this.publisher();
        const authors = this.authors();
        const authorControls = this.authorPercentageControls();

        if (
          publisher &&
          (authors.length === 0 ||
            authors.every((author) => authorControls.has(author.id)))
        ) {
          // Recalculate publisher percentage when royalties change
          this.calculatePublisherPercentage();
        }
      });

    // Setup effect to watch for author changes and re-initialize controls
    // Use runInInjectionContext to allow effect() to be called in ngOnInit
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const authors = this.authors();
        if (authors && authors.length > 0) {
          // Check if controls need to be initialized or updated
          const currentControls = this.authorPercentageControls();
          const authorIds = new Set(authors.map((a) => a.id));
          const controlIds = new Set(currentControls.keys());

          // If authors changed, re-initialize
          if (
            authorIds.size !== controlIds.size ||
            !Array.from(authorIds).every((id) => controlIds.has(id))
          ) {
            this.initializeAuthorPercentageControls();
          }
        }
      });

      // Setup effect to watch for royalties, authors, and publisher changes
      // This ensures publisher percentage is set when royalties are prefilled from server
      effect(() => {
        const royalties = this.royaltiesController();
        const authors = this.authors();
        const publisher = this.publisher();

        // Only calculate if we have publisher and at least authors or royalties
        if (publisher && (authors?.length > 0 || royalties?.length > 0)) {
          // Check if author percentage controls are initialized
          const authorControls = this.authorPercentageControls();
          const hasAllAuthorControls =
            authors.length === 0 ||
            authors.every((author) => authorControls.has(author.id));

          // If author controls are ready (or no authors), calculate publisher percentage
          if (hasAllAuthorControls) {
            // Use setTimeout to ensure this runs after all initialization is complete
            setTimeout(() => {
              this.calculatePublisherPercentage();
            }, 150);
          }
        }
      });
    });

    // Initial sync - use longer timeout to ensure all data is loaded
    // This handles the case where royalties are prefilled before component initializes
    setTimeout(() => {
      const publisher = this.publisher();
      const authors = this.authors();
      const royalties = this.royaltiesController();

      if (publisher && royalties.length > 0) {
        // Re-initialize author controls if needed (in case royalties were set before init)
        if (authors.length > 0) {
          const authorControls = this.authorPercentageControls();
          const hasAllAuthorControls = authors.every((author) =>
            authorControls.has(author.id)
          );
          if (!hasAllAuthorControls) {
            this.initializeAuthorPercentageControls();
          }
        }

        this.syncAuthorPercentagesToRoyalties();
        this.calculatePublisherPercentage();
        // Trigger royalty amount calculation after initial sync
        setTimeout(() => {
          this.updateRoyaltyAmounts();
        }, 600);
      }
    }, 500);
  }

  /**
   * Initialize form controls for author percentages
   * One control per author
   * Uses the first platform's percentage value if multiple exist
   */
  private initializeAuthorPercentageControls(): void {
    const authors = this.authors();
    const controls = new Map<number, FormControl<number | null>>();

    // Get existing author percentages from royalties (use first platform as reference)
    authors.forEach((author) => {
      // Find first royalty entry for this author (any platform)
      const existingRoyalty = this.royaltiesController().controls.find(
        (r) =>
          r.controls.authorId.value === author.id &&
          r.controls.platform.value &&
          r.controls.percentage.value !== null &&
          r.controls.percentage.value !== undefined
      );

      // Use the percentage from first platform found, or default to 100 if none exists
      const initialValue =
        existingRoyalty?.controls.percentage.value !== null &&
        existingRoyalty?.controls.percentage.value !== undefined
          ? existingRoyalty.controls.percentage.value
          : 100;

      // Round to whole number
      const roundedInitialValue = Math.round(initialValue);

      const control = new FormControl<number | null>(roundedInitialValue, [
        Validators.required,
        Validators.min(0),
        Validators.max(100),
      ]);

      // Subscribe to changes and sync to all platforms
      // Round values to whole numbers on change
      control.valueChanges
        .pipe(debounceTime(300), takeUntil(this.destroy$))
        .subscribe((value) => {
          if (value !== null && !isNaN(Number(value))) {
            const roundedValue = Math.round(Number(value));
            if (roundedValue !== value) {
              control.patchValue(roundedValue, { emitEvent: false });
            }
          }
          this.syncAuthorPercentagesToRoyalties();
          this.calculatePublisherPercentage();
        });

      controls.set(author.id, control);
    });

    this.authorPercentageControls.set(controls);

    // Always trigger calculation after initializing controls
    // This ensures publisher percentage is set even when royalties are prefilled
    const publisher = this.publisher();
    const hasAnyRoyalties = this.royaltiesController().controls.some(
      (r) => r.controls.authorId.value || r.controls.publisherId.value
    );

    if (authors.length > 0) {
      if (!hasAnyRoyalties) {
        // No royalties exist yet, initialize them
        setTimeout(() => {
          this.syncAuthorPercentagesToRoyalties();
          this.calculatePublisherPercentage();
          // Trigger royalty amount calculation
          setTimeout(() => {
            this.updateRoyaltyAmounts();
          }, 300);
        }, 200);
      } else {
        // Royalties exist (prefilled from server), sync and calculate publisher percentage
        // Use longer timeout to ensure all data is loaded
        setTimeout(() => {
          this.syncAuthorPercentagesToRoyalties();
          // Always recalculate publisher percentage based on author percentages
          // This ensures it's set correctly even when royalties are prefilled
          this.calculatePublisherPercentage();
          // Trigger royalty amount calculation
          setTimeout(() => {
            this.updateRoyaltyAmounts();
          }, 400);
        }, 300);
      }
    } else if (publisher) {
      // If no authors but publisher exists, still calculate publisher percentage
      // This handles edge case where publisher should get 100%
      setTimeout(() => {
        this.calculatePublisherPercentage();
        // Trigger royalty amount calculation
        setTimeout(() => {
          this.updateRoyaltyAmounts();
        }, 400);
      }, 300);
    }
  }

  /**
   * Sync author percentages to all platform royalties
   * Applies the same percentage to all platforms for each author
   */
  private syncAuthorPercentagesToRoyalties(): void {
    const authors = this.authors();
    const platforms = this.displayedColumns();
    const authorControls = this.authorPercentageControls();

    authors.forEach((author) => {
      const percentage = authorControls.get(author.id)?.value;

      platforms.forEach((platform) => {
        // Find or create royalty control for this author-platform combination
        let royaltyControl = this.royaltiesController().controls.find(
          (r) =>
            r.controls.authorId.value === author.id &&
            r.controls.platform.value === platform
        );

        if (!royaltyControl) {
          // Create new royalty control if it doesn't exist
          royaltyControl = new FormGroup<RoyaltyFormGroup>({
            id: new FormControl<number | null>(null),
            name: new FormControl<string | null>(
              author.name ||
                `${author.user?.firstName || ''} ${
                  author.user?.lastName || ''
                }`.trim()
            ),
            authorId: new FormControl<number | null>(author.id),
            publisherId: new FormControl<number | null>(null),
            platform: new FormControl<string | null>(platform),
            percentage: new FormControl<number | null>(percentage as number, [
              Validators.required,
            ]),
            titleId: new FormControl<number | null>(
              this.royaltiesController().at(0)?.controls.titleId.value || null
            ),
          });

          this.royaltiesController().push(royaltyControl);
        } else {
          // Update existing control
          royaltyControl.controls.percentage.patchValue(percentage, {
            emitEvent: false,
          });
        }
      });
    });

    // Manually trigger royalty amount calculation since we update with emitEvent: false
    setTimeout(() => {
      this.updateRoyaltyAmounts();
    }, 100);
  }

  /**
   * Calculate publisher percentage automatically
   * Publisher gets: 100 - sum of all author percentages
   */
  private calculatePublisherPercentage(): void {
    const publisher = this.publisher();
    if (!publisher) {
      return; // No publisher, nothing to calculate
    }

    const authorControls = this.authorPercentageControls();
    let totalAuthorPercentage = 0;

    authorControls.forEach((control) => {
      const value = control.value;
      if (value !== null && !isNaN(Number(value))) {
        totalAuthorPercentage += Number(value);
      }
    });

    const publisherPercentage = Math.max(0, 100 - totalAuthorPercentage);
    this.publisherPercentage.set(publisherPercentage);

    // Sync publisher percentage to all platform royalties
    const platforms = this.displayedColumns();

    if (platforms.length === 0) {
      return; // No platforms available yet
    }

    platforms.forEach((platform) => {
      let royaltyControl = this.royaltiesController().controls.find(
        (r) =>
          r.controls.publisherId.value === publisher.id &&
          r.controls.platform.value === platform
      );

      if (!royaltyControl) {
        // Create new royalty control if it doesn't exist
        royaltyControl = new FormGroup<RoyaltyFormGroup>({
          id: new FormControl<number | null>(null),
          name: new FormControl<string | null>(
            publisher.name ||
              `${publisher.user?.firstName || ''} ${
                publisher.user?.lastName || ''
              }`.trim() ||
              'Unknown Publisher'
          ),
          authorId: new FormControl<number | null>(null),
          publisherId: new FormControl<number | null>(publisher.id),
          platform: new FormControl<string | null>(platform),
          percentage: new FormControl<number | null>(publisherPercentage, [
            Validators.required,
          ]),
          titleId: new FormControl<number | null>(
            this.royaltiesController().at(0)?.controls.titleId.value || null
          ),
        });

        this.royaltiesController().push(royaltyControl);
      } else {
        // Update existing control - always update to ensure it matches calculated value
        royaltyControl.controls.percentage.patchValue(publisherPercentage, {
          emitEvent: false,
        });
      }
    });

    // Manually trigger royalty amount calculation since we update with emitEvent: false
    setTimeout(() => {
      this.updateRoyaltyAmounts();
    }, 100);
  }

  /**
   * Calculate total royalties per platform
   */
  private calculateTotalRoyalties(): void {
    this.royaltiesController()
      .valueChanges.pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe((data) => {
        const temp: Partial<Record<string, number>> = {};
        const platforms = this.platformService.platforms();
        platforms.forEach((platform) => {
          temp[platform.name] = data
            .filter((d) => d.platform === platform.name)
            .reduce((a, { percentage }) => a + (percentage || 0), 0);
        });
        this.totalRoyalties.set(temp);
        this.validateTotalRoyalties();
      });
  }

  /**
   * Validate that total royalties don't exceed 100% per platform
   */
  private validateTotalRoyalties(): void {
    Object.keys(this.totalRoyalties()).forEach((key) => {
      const val = (this.totalRoyalties() as any)[key] as number;
      if (val > 100) {
        this.royaltiesController().setErrors({
          ...this.royaltiesController().errors,
          invalid: `Royalties for ${key} cannot be higher than 100%`,
        });
      } else {
        // Clear error if valid
        const errors = { ...this.royaltiesController().errors };
        delete errors['invalid'];
        this.royaltiesController().setErrors(
          Object.keys(errors).length > 0 ? errors : null
        );
      }
    });
  }

  /**
   * Calculate royalty amount per person per platform
   * Can be called manually or via subscription
   */
  private calculateRoyaltyAmountPerPerson(): void {
    // Setup subscription for automatic updates when form values change
    // Increased debounce time to reduce API calls
    // Also watch for changes in printingPrice and customPrintCost
    combineLatest([
      this.royaltiesController().valueChanges,
      this.pricingControls().valueChanges,
    ])
      .pipe(debounceTime(600), takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateRoyaltyAmounts();
      });

    // Watch for changes in printing price or custom print cost
    // Use effect to watch signal changes
    runInInjectionContext(this.injector, () => {
      effect(() => {
        // Access signals to trigger effect
        const printingPrice = this.printingPrice();
        const customPrintCost = this.customPrintCost();
        
        // Recalculate royalties when printing costs change
        if (printingPrice !== null || customPrintCost !== null) {
          setTimeout(() => {
            this.updateRoyaltyAmounts();
          }, 300);
        }
      });
    });

    // Also calculate immediately on initialization
    setTimeout(() => {
      this.updateRoyaltyAmounts();
    }, 500);
  }

  /**
   * Manually calculate and update royalty amounts using centralized API
   * This is called when royalties are updated with emitEvent: false
   */
  private async updateRoyaltyAmounts(): Promise<void> {
    const data = this.royaltiesController().value;
    const pricingData = this.pricingControls().value;

    // Group by platform: collect price and all unique percentages
    const platformMap = new Map<
      string,
      { price: number; percentages: Set<string> }
    >();

    // First, collect all platforms and their MRP (not salesPrice, we need MRP for calculation)
    pricingData.forEach((pricing) => {
      if (!pricing.platform || !pricing.mrp) return;

      const platform = pricing.platform;
      const mrp = pricing.mrp; // Use MRP for calculation

      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          price: mrp,
          percentages: new Set(),
        });
      } else {
        platformMap.get(platform)!.price = mrp;
      }
    });

    // Collect all percentages for each platform
    data.forEach(({ percentage, platform }) => {
      if (!platform || percentage === null || percentage === undefined) return;

      const platformData = platformMap.get(platform);
      if (platformData) {
        platformData.percentages.add(percentage.toString());
      }
    });

    // Prepare API request - one item per platform with all percentages
    const apiItems: Array<{
      platform: string;
      price: number;
      division: string[];
    }> = [];

    platformMap.forEach((platformData, platform) => {
      if (platformData.percentages.size > 0) {
        apiItems.push({
          platform,
          price: platformData.price,
          division: Array.from(platformData.percentages).sort(),
        });
      }
    });

    if (apiItems.length === 0) {
      this.totalRoyaltiesAmount.set({});
      return;
    }

    try {
      // Call centralized API with actual printing price (not custom)
      // Custom print cost margin is calculated separately for display
      const response = await this.royaltyService.calculateRoyalties({
        items: apiItems,
        printingPrice: this.printingPrice() || 0, // Use actual print cost for calculations
      });

      // Create a map: platform -> divisionValue (percentage -> amount)
      const platformDivisionMap = new Map<string, Record<string, number>>();
      response.divisionValue.forEach((item) => {
        platformDivisionMap.set(item.platform, item.divisionValue);
      });

      // Map API response back to our structure
      const temp: Record<string, Partial<Record<string, number>>> = {};
      const extraMargin: Partial<Record<string, number>> = {};

      // Calculate extra margin for publishers from custom print cost
      const actualPrintCost = this.printingPrice() || 0;
      const customPrint = this.customPrintCost();
      const publisherId = this.publisher()?.id;

      // Calculate extra margin per platform (only for print platforms)
      const printPlatforms = this.displayedColumns().filter(
        (platform) => !this.isEbookPlatform(platform)
      );
      
      if (
        publisherId &&
        customPrint !== null &&
        customPrint !== undefined &&
        customPrint > actualPrintCost
      ) {
        const marginPerUnit = customPrint - actualPrintCost;
        printPlatforms.forEach((platform) => {
          extraMargin[platform] = marginPerUnit;
        });
      }

      data.forEach(({ authorId, publisherId: royaltyPublisherId, percentage, platform }) => {
        if (!platform || percentage === null || percentage === undefined)
          return;

        const key = authorId ? 'author' + authorId : 'publisher' + royaltyPublisherId;

        if (!temp[key]) {
          temp[key] = {};
        }

        const divisionValue = platformDivisionMap.get(platform);
        let baseAmount = 0;
        if (divisionValue) {
          baseAmount = divisionValue[percentage.toString()] || 0;
        }

        // Add extra margin to publisher's royalty amount for print platforms
        if (
          royaltyPublisherId &&
          publisherId === royaltyPublisherId &&
          !this.isEbookPlatform(platform) &&
          extraMargin[platform]
        ) {
          // Extra margin is a flat amount per unit (not percentage-based)
          temp[key][platform] = baseAmount + (extraMargin[platform] || 0);
        } else {
          temp[key][platform] = baseAmount;
        }
      });

      this.totalRoyaltiesAmount.set(temp);
      this.publisherExtraMargin.set(extraMargin);
    } catch (error) {
      console.error('Failed to calculate royalties:', error);
      // Fallback to local calculation on error
      this.updateRoyaltyAmountsLocal();
    }
  }

  /**
   * Fallback local calculation if API fails
   */
  private updateRoyaltyAmountsLocal(): void {
    const data = this.royaltiesController().value;
    const temp: Record<string, Partial<Record<string, number>>> = {};

    data.forEach(({ authorId, publisherId, percentage, platform }) => {
      if (!platform) return;

      const key = authorId ? 'author' + authorId : 'publisher' + publisherId;

      if (!temp[key]) {
        temp[key] = {};
      }

      const salesPrice = this.pricingControls().controls.find(
        ({ controls }) => controls.platform.value === platform
      )?.controls.salesPrice?.value;

      const isEbookPlatform = this.isEbookPlatform(platform);
      const printingCost = isEbookPlatform ? 0 : this.printingPrice() || 0;

      temp[key][platform] = Number(
        percentage && salesPrice
          ? ((salesPrice - printingCost) * (percentage / 100)).toFixed(2)
          : 0
      );
    });

    this.totalRoyaltiesAmount.set(temp);
  }

  /**
   * Get author percentage control
   * Creates a control if it doesn't exist (for template safety)
   */
  getAuthorPercentageControl(authorId: number): FormControl<number | null> {
    const controls = this.authorPercentageControls();
    let control = controls.get(authorId);

    // If control doesn't exist, create it immediately
    if (!control) {
      // Check if author exists
      const author = this.authors().find((a) => a.id === authorId);
      if (author) {
        // Find existing royalty value or default to 100
        const existingRoyalty = this.royaltiesController().controls.find(
          (r) =>
            r.controls.authorId.value === authorId &&
            r.controls.platform.value &&
            r.controls.percentage.value !== null &&
            r.controls.percentage.value !== undefined
        );

        const initialValue =
          existingRoyalty?.controls.percentage.value !== null &&
          existingRoyalty?.controls.percentage.value !== undefined
            ? existingRoyalty.controls.percentage.value
            : 100;

        control = new FormControl<number | null>(Math.round(initialValue), [
          Validators.required,
          Validators.min(0),
          Validators.max(100),
        ]);

        // Subscribe to changes
        // Round values to whole numbers on change
        if (control) {
          control.valueChanges
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe((value) => {
              if (value !== null && !isNaN(Number(value))) {
                const roundedValue = Math.round(Number(value));
                if (roundedValue !== value && control) {
                  control.patchValue(roundedValue, { emitEvent: false });
                }
              }
              this.syncAuthorPercentagesToRoyalties();
              this.calculatePublisherPercentage();
              // Manually trigger royalty amount calculation since we update with emitEvent: false
              setTimeout(() => {
                this.updateRoyaltyAmounts();
              }, 100);
            });
        }

        // Add to map - defer signal update to avoid writing during template rendering
        const newControls = new Map(controls);
        newControls.set(authorId, control);
        // Use setTimeout to defer signal update until after current render cycle
        setTimeout(() => {
          this.authorPercentageControls.set(newControls);
        }, 0);
      } else {
        // Author not found, return a temporary control
        control = new FormControl<number | null>(null);
      }
    }

    return control;
  }

  /**
   * Get total author percentages
   */
  getTotalAuthorPercentages(): number {
    let total = 0;
    this.authorPercentageControls().forEach((control) => {
      const value = control.value;
      if (value !== null && !isNaN(Number(value))) {
        total += Number(value);
      }
    });
    return total;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Filter pricing controls to only show platforms relevant to the publishing type
   */
  visiblePricingControls(): PricingGroup[] {
    const allowedPlatforms = this.displayedColumns();

    if (!allowedPlatforms.length) {
      return this.pricingControls().controls;
    }

    const allowedSet = new Set<string>(allowedPlatforms);

    return this.pricingControls().controls.filter((control) => {
      const platform = control.controls.platform.value as string | null;
      if (!platform) {
        return true;
      }
      return allowedSet.has(platform);
    });
  }

  isEbookPlatform(platform: string | null | undefined): boolean {
    if (!platform) {
      return false;
    }
    const platformData = this.platformService.getPlatformByName(platform);
    return platformData?.type === 'EBOOK';
  }
}
