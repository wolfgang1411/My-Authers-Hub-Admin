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
  // Store original values for disabled controls to prevent changes
  private readonly disabledControlValues = new Map<
    FormControl,
    number | null
  >();

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

  // Form validation inputs
  isPrintingValid = input<boolean>(false);
  isPricingValid = input<boolean>(false);
  hasPricing = input<boolean>(false);

  // Signal to track pricing validity for publishers (updated reactively)
  private pricingValidityForPublisher = signal<boolean>(false);

  // Flag to prevent concurrent sync operations
  private isSyncing = false;

  // Helper method to check if pricing is valid for publishers
  private checkPricingValidityForPublisher(): boolean {
    const pricingControls = this.pricingControls().controls;
    const displayedPlatforms = this.displayedColumns();
    const displayedSet = new Set(displayedPlatforms);

    // If no platforms to display, consider it valid (no pricing needed)
    if (displayedPlatforms.length === 0) {
      return true;
    }

    // Check if all pricing controls that publishers should fill are valid
    for (const control of pricingControls) {
      const platform = control.controls.platform.value as string | null;
      if (!platform) {
        continue;
      }

      // Only validate platforms that should be displayed based on publishing type
      if (!displayedSet.has(platform)) {
        continue;
      }

      // Get platform data to check if it's superadmin-only
      const platformData = this.platformService.getPlatformByName(platform);
      const isSuperAdminOnly = platformData?.isSuperAdminPricingOnly ?? false;

      // For superadmin-only platforms, only validate if pricing already exists
      if (isSuperAdminOnly) {
        const hasPricing =
          control.controls.id.value != null ||
          control.controls.salesPrice.value != null ||
          control.controls.mrp.value != null;

        // If pricing doesn't exist, skip validation (publisher can't fill it)
        if (!hasPricing) {
          continue;
        }
      }

      // For all other platforms (or superadmin-only with pricing), check validity
      // Note: Disabled controls are still considered valid in Angular forms
      if (!control.valid) {
        // Check if control is disabled - disabled controls are always valid
        if (control.disabled) {
          continue;
        }

        return false;
      }
    }

    return true;
  }

  // Computed: Check if pricing is valid for platforms that the current user can fill
  // For publishers, exclude superadmin-only platforms from validation
  isPricingValidForUser = computed(() => {
    const accessLevel = this.accessLevel();
    const isPublisher = accessLevel === 'PUBLISHER';

    // If superadmin, use the parent's isPricingValid
    if (!isPublisher) {
      return this.isPricingValid();
    }

    // For publishers, use the reactively updated signal
    return this.pricingValidityForPublisher();
  });

  // Computed: Are all forms valid?
  areFormsValid = computed(() => {
    const isPrintingValid = this.isPrintingValid();
    const isPricingValid = this.isPricingValidForUser();
    const hasPricing = this.hasPricing();
    const hasPublisher = this.publisher() !== null;

    return isPrintingValid && isPricingValid && hasPricing && hasPublisher;
  });

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
      return allPlatforms.filter((p) => p.isEbookPlatform).map((p) => p.name);
    }

    if (publishingType === PublishingType.ONLY_PRINT) {
      // For print-only titles, only show print platforms
      return allPlatforms.filter((p) => !p.isEbookPlatform).map((p) => p.name);
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

    // Setup "Same as MRP" feature - sync Sales Price when checkbox is checked
    this.setupSameAsMrpSync();

    // Initialize author percentage controls from existing royalties
    this.initializeAuthorPercentageControls();

    // Ensure all pricing controls are enabled by default
    // This prevents any controls from being stuck in disabled state
    setTimeout(() => {
      this.pricingControls().controls.forEach((control) => {
        if (control.controls.mrp.disabled) {
          control.controls.mrp.enable({ emitEvent: false });
        }
        if (control.controls.salesPrice.disabled) {
          control.controls.salesPrice.enable({ emitEvent: false });
        }
      });
    }, 100);

    // Watch FormArray changes to detect when royalties are added
    // This is crucial for detecting when royalties are prefilled from server
    // SIMPLIFIED: Single sync operation, no setTimeout - let debounce handle timing
    this.royaltiesController()
      .valueChanges.pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        // When royalties change, sync everything in one go
        this.syncAllAuthorAndPublisherPercentages();
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

      // Watch form validity and update controls accordingly
      // Note: Author percentage controls should always be enabled for input
      // They are only used for calculation, not for blocking user input
      effect(() => {
        // Access pricing validity to make effect reactive to pricing changes
        const isPricingValid = this.isPricingValidForUser();
        const formsValid = this.areFormsValid();
        const authorControls = this.authorPercentageControls();
        const authors = this.authors();
        const pricingControls = this.pricingControls();
        // Access royalties to make effect reactive to royalty changes (e.g., on page load)
        // CRITICAL: Access both the array, its length, and values to ensure reactivity
        const royalties = this.royaltiesController();
        const royaltiesLength = royalties.length;
        const royaltiesValue = royalties.value; // Access value to make effect reactive to royalty data changes
        // Also access controls to ensure reactivity when royalty controls change
        const royaltiesControls = royalties.controls;
        // Access a sample of royalty values to ensure effect runs when royalties load
        if (royaltiesControls.length > 0) {
          royaltiesControls.forEach((control) => {
            // Access percentage value to make effect reactive
            const _ = control.controls.percentage.value;
          });
        }

        // SIMPLIFIED: Effect only ensures controls are enabled and triggers sync
        // The actual sync logic is in syncAllAuthorAndPublisherPercentages()
        // This prevents conflicts and ensures single source of truth

        // Always ensure controls are enabled - users should be able to input percentages
        authorControls.forEach((control) => {
          if (control.disabled) {
            control.enable();
          }
        });

        // CRITICAL FIX: Always sync FROM royalties if they exist, regardless of form validity
        // This ensures saved values (like 80) are always shown, even when forms are invalid
        // Royalties are the source of truth - show them even if pricing is missing
        const hasAnyRoyalties =
          royaltiesLength > 0 ||
          this.royaltiesController().controls.some(
            (r) =>
              r.controls.percentage.value !== null &&
              r.controls.percentage.value !== undefined
          );

        if (hasAnyRoyalties) {
          console.log('[Effect] Has royalties, syncing FROM royalties');
          // Always sync FROM royalties - don't wait for forms to be valid
          // This ensures publisher's saved values (like 80) are shown even when superadmin hasn't added pricing yet
          setTimeout(() => {
            console.log('[Effect] Calling syncAuthorControlsFromRoyalties');
            // Only sync FROM royalties, not TO royalties (don't create new royalties when forms invalid)
            this.syncAuthorControlsFromRoyalties();
            // FIXED: Always calculate publisher percentage if we have publisher and authors
            // This ensures publisher gets correct percentage even when forms invalid (no pricing)
            if (this.publisher() && authors.length > 0) {
              this.calculatePublisherPercentage();
            }
          }, 50);
        } else {
          console.log('[Effect] No royalties found');
          if (!formsValid) {
            // CRITICAL: Need both authors AND publisher for valid royalty calculation
            // If either is missing, don't set default percentages
            const hasAuthors = authors.length > 0;
            const hasPublisher = this.publisher() !== null;

            if (hasAuthors && hasPublisher) {
              // FIXED: When no pricing and no royalties, authors should get default percentage (not 0)
              // Authors are the creators and should get royalty by default, not publisher
              // Calculate default percentage based on author count (ONLY when both authors and publisher exist)
              const authorCount = authors.length;
              const defaultAuthorPercentage: number =
                authorCount > 0
                  ? authorCount === 1
                    ? 100
                    : Math.round((100 / authorCount) * 100) / 100
                  : 0;

              authorControls.forEach((control) => {
                // Set to default percentage (split equally among authors)
                if (control.value !== defaultAuthorPercentage) {
                  control.patchValue(defaultAuthorPercentage, {
                    emitEvent: false,
                  });
                }
              });
              // Also calculate publisher percentage to ensure it's set to 0 when forms invalid
              setTimeout(() => {
                this.calculatePublisherPercentage();
              }, 50);
            } else {
              // No authors or no publisher - set all to 0, can't calculate royalties
              authorControls.forEach((control) => {
                if (control.value !== 0) {
                  control.patchValue(0, { emitEvent: false });
                }
              });
            }
          }
        }
      });
    });

    // SINGLE initial sync - ensure all data is loaded
    // This handles the case where royalties are prefilled before component initializes
    setTimeout(() => {
      const accessLevel = this.accessLevel();

      // For publishers, update pricing validity signal first
      if (accessLevel === 'PUBLISHER') {
        const isValid = this.checkPricingValidityForPublisher();
        this.pricingValidityForPublisher.set(isValid);
      }

      // Sync everything in one deterministic operation
      this.syncAllAuthorAndPublisherPercentages();

      // Also trigger royalty amount calculation after sync
      // This ensures amounts are calculated even when some pricing is missing
      setTimeout(() => {
        this.updateRoyaltyAmounts();
      }, 700);
    }, 600);
  }

  /**
   * Initialize form controls for author percentages
   * One control per author
   * Uses the first platform's percentage value if multiple exist
   * Sets to 0 and disables if forms are not valid
   */
  private initializeAuthorPercentageControls(): void {
    const authors = this.authors();
    const controls = new Map<number, FormControl<number | null>>();
    const formsValid = this.areFormsValid();

    authors.forEach((author) => {
      // CRITICAL FIX: Always check for existing royalties first, regardless of form validity
      // This ensures saved values (like 80) are loaded even when some pricing is missing
      const accessLevel = this.accessLevel();
      let percent = 0;

      // Check for existing royalties - always do this, even if forms are invalid
      let authorRoyalties;
      if (accessLevel === 'SUPERADMIN') {
        // Superadmin can see all royalties
        authorRoyalties = this.royaltiesController().controls.filter(
          (r) =>
            r.controls.authorId.value === author.id &&
            r.controls.platform.value &&
            r.controls.percentage.value !== null &&
            r.controls.percentage.value !== undefined
        );
      } else {
        // Publisher only sees visible platforms
        const displayedPlatforms = this.displayedColumns();
        const displayedSet = new Set(displayedPlatforms);
        authorRoyalties = this.royaltiesController().controls.filter(
          (r) =>
            r.controls.authorId.value === author.id &&
            r.controls.platform.value &&
            displayedSet.has(r.controls.platform.value) &&
            r.controls.percentage.value !== null &&
            r.controls.percentage.value !== undefined
        );
      }

      // Find the first non-zero royalty value
      const existingRoyalty = authorRoyalties.find(
        (r) => r.controls.percentage.value !== 0
      );

      if (existingRoyalty) {
        // Use existing royalty value if found (this is the saved value like 80)
        percent = existingRoyalty.controls.percentage.value ?? 0;
      } else {
        // CRITICAL: Need both authors AND publisher for valid royalty calculation
        // If no publisher, set to 0 (can't distribute royalties without publisher)
        const hasPublisher = this.publisher() !== null;

        if (hasPublisher) {
          // FIXED: Always use default percentage (authors get 100% by default, not 0%)
          // Authors are the creators and should get royalty by default, regardless of pricing status
          const authorCount = authors.length;
          const defaultAuthorPercentage: number =
            authorCount > 0
              ? authorCount === 1
                ? 100
                : Math.round((100 / authorCount) * 100) / 100
              : 0;
          percent = defaultAuthorPercentage;
        } else {
          // No publisher - can't calculate royalties, set to 0
          percent = 0;
        }
      }

      // Create % control
      const percentControl = new FormControl(Math.round(percent), [
        Validators.required,
        Validators.min(0),
        Validators.max(100),
      ]);

      // CRITICAL FIX: Always keep controls enabled
      // This allows users to see and edit saved values even when some pricing is missing
      // Form validity only affects submission, not viewing/editing

      percentControl.valueChanges
        .pipe(debounceTime(300), takeUntil(this.destroy$))
        .subscribe((v) => {
          if (v != null && !isNaN(Number(v))) {
            const roundedValue = Math.round(Number(v));
            if (roundedValue !== v) {
              percentControl.patchValue(roundedValue, { emitEvent: false });
            }
            this.syncAuthorPercentagesToRoyalties();
            this.calculatePublisherPercentage();
            // Subscription will handle updateRoyaltyAmounts
          }
        });

      controls.set(author.id, percentControl);
    });

    this.authorPercentageControls.set(controls);

    // Always trigger calculation after initializing controls
    // This ensures publisher percentage is set even when royalties are prefilled
    const publisher = this.publisher();
    const hasAnyRoyalties = this.royaltiesController().controls.some(
      (r) => r.controls.authorId.value || r.controls.publisherId.value
    );

    // After initializing controls, sync everything in one go
    // No setTimeout needed - let the main sync handle timing
    if (authors.length > 0 || publisher) {
      // Sync will happen in the main sync method
      // This ensures consistent behavior whether royalties exist or not
    }
  }

  /**
   * Sync author controls FROM royalties (reverse of syncAuthorPercentagesToRoyalties)
   * Updates author percentage controls with values from existing royalties
   */
  private syncAuthorControlsFromRoyalties(): void {
    console.log('[syncAuthorControlsFromRoyalties] START');
    const authors = this.authors();
    const authorControls = this.authorPercentageControls();
    const accessLevel = this.accessLevel();
    const formsValid = this.areFormsValid();

    console.log(
      '[syncAuthorControlsFromRoyalties] authors:',
      authors.length,
      'accessLevel:',
      accessLevel,
      'formsValid:',
      formsValid
    );

    // CRITICAL FIX: Don't check formsValid - always sync if royalties exist
    // This ensures saved values are shown even when some pricing is missing
    if (authors.length === 0) {
      console.log('[syncAuthorControlsFromRoyalties] No authors, returning');
      return;
    }

    // Don't check for publisher here - let the parent sync method handle validation
    // This method should just sync the values from royalties to controls

    // Calculate default percentage based on author count
    // CRITICAL: Only use default if publisher exists, otherwise use 0
    const publisher = this.publisher();
    const authorCount = authors.length;
    const defaultAuthorPercentage: number =
      publisher && authorCount > 0
        ? authorCount === 1
          ? 100
          : Math.round((100 / authorCount) * 100) / 100
        : 0;

    authors.forEach((author) => {
      const control = authorControls.get(author.id);
      if (!control) {
        return;
      }

      // CRITICAL FIX: For superadmin, check ALL royalties (including admin-only platforms)
      // For publisher, only check visible platforms
      // This ensures that when superadmin adds pricing for admin-only platforms,
      // the saved royalty values (like 80) are found and loaded, not defaults (100)
      let authorRoyalties;
      if (accessLevel === 'SUPERADMIN') {
        // Superadmin can see all royalties, including admin-only platforms
        authorRoyalties = this.royaltiesController().controls.filter(
          (r) =>
            r.controls.authorId.value === author.id &&
            r.controls.platform.value &&
            r.controls.percentage.value !== null &&
            r.controls.percentage.value !== undefined
        );
        console.log(
          `[syncAuthorControlsFromRoyalties] Author ${author.id} (SUPERADMIN): Found ${authorRoyalties.length} royalties:`,
          authorRoyalties.map((r) => ({
            platform: r.controls.platform.value,
            percentage: r.controls.percentage.value,
          }))
        );
      } else {
        // Publisher only sees visible platforms
        const displayedPlatforms = this.displayedColumns();
        const displayedSet = new Set(displayedPlatforms);
        authorRoyalties = this.royaltiesController().controls.filter(
          (r) =>
            r.controls.authorId.value === author.id &&
            r.controls.platform.value &&
            displayedSet.has(r.controls.platform.value) &&
            r.controls.percentage.value !== null &&
            r.controls.percentage.value !== undefined
        );
        console.log(
          `[syncAuthorControlsFromRoyalties] Author ${author.id} (PUBLISHER): Found ${authorRoyalties.length} royalties from visible platforms`
        );
      }

      // Find ANY royalty with a value (including zero) - use the first one found
      // This ensures we use existing royalties instead of defaults
      let existingRoyalty =
        authorRoyalties.length > 0 ? authorRoyalties[0] : null;

      // Prefer non-zero values if available
      if (authorRoyalties.length > 0) {
        const nonZeroRoyalty = authorRoyalties.find(
          (r) =>
            r.controls.percentage.value !== 0 &&
            r.controls.percentage.value !== null
        );
        if (nonZeroRoyalty) {
          existingRoyalty = nonZeroRoyalty;
        }
      }

      console.log(
        `[syncAuthorControlsFromRoyalties] Author ${author.id}: existingRoyalty:`,
        existingRoyalty
          ? {
              platform: existingRoyalty.controls.platform.value,
              percentage: existingRoyalty.controls.percentage.value,
            }
          : 'none'
      );

      // Determine what value should be set
      // CRITICAL: Use ANY existing royalty value (even 0), not default
      const royaltyValue = existingRoyalty?.controls.percentage.value;
      const valueToSet =
        existingRoyalty !== null &&
        royaltyValue !== null &&
        royaltyValue !== undefined
          ? royaltyValue // Use existing royalty value (even if 0)
          : authorRoyalties.length > 0
          ? 0
          : defaultAuthorPercentage; // If royalties exist but all null, use 0, otherwise default
      const roundedValue = Math.round(valueToSet);

      console.log(
        `[syncAuthorControlsFromRoyalties] Author ${author.id}: royaltyValue=${royaltyValue}, valueToSet=${valueToSet}, roundedValue=${roundedValue}, currentValue=${control.value}`
      );

      // Always update if:
      // 1. Value is null/undefined/0 and we have royalties
      // 2. Value doesn't match roundedValue
      // 3. Control is disabled (should be enabled)
      // 4. FIXED: No royalties exist and current value doesn't match default
      const currentValue = control.value;
      const hasRoyalties = authorRoyalties.length > 0;
      const shouldUpdate =
        ((currentValue === null ||
          currentValue === undefined ||
          currentValue === 0) &&
          hasRoyalties) ||
        (currentValue !== roundedValue && hasRoyalties) ||
        (currentValue === 100 &&
          hasRoyalties &&
          royaltyValue !== null &&
          royaltyValue !== undefined &&
          royaltyValue !== 100) ||
        control.disabled ||
        // FIXED: When no royalties exist, update if current doesn't match default
        (!hasRoyalties && currentValue !== roundedValue);

      console.log(
        `[syncAuthorControlsFromRoyalties] Author ${author.id}: shouldUpdate=${shouldUpdate}, control.disabled=${control.disabled}`
      );

      if (shouldUpdate) {
        // Ensure control is enabled
        if (control.disabled) {
          console.log(
            `[syncAuthorControlsFromRoyalties] Author ${author.id}: Enabling control`
          );
          control.enable({ emitEvent: false });
        }

        // Use the exact royalty value if it exists, rounded for display
        const valueToUse =
          hasRoyalties && royaltyValue !== null && royaltyValue !== undefined
            ? Math.round(royaltyValue)
            : roundedValue;

        console.log(
          `[syncAuthorControlsFromRoyalties] Author ${author.id}: Updating control from ${currentValue} to ${valueToUse}`
        );
        control.patchValue(valueToUse, { emitEvent: false });
      }
    });
    console.log('[syncAuthorControlsFromRoyalties] END');
  }

  /**
   * SINGLE SOURCE OF TRUTH: Sync all author and publisher percentages
   * Always uses royalties as the source of truth
   * Order: FROM royalties -> TO royalties -> calculate publisher
   * This ensures consistent behavior and prevents conflicts
   * Uses a flag to prevent concurrent syncs
   */
  private syncAllAuthorAndPublisherPercentages(): void {
    console.log(
      '[syncAllAuthorAndPublisherPercentages] START, isSyncing:',
      this.isSyncing
    );

    // Prevent concurrent syncs
    if (this.isSyncing) {
      console.log(
        '[syncAllAuthorAndPublisherPercentages] Already syncing, returning'
      );
      return;
    }

    this.isSyncing = true;

    try {
      const formsValid = this.areFormsValid();
      const authors = this.authors();
      const publisher = this.publisher();

      console.log(
        '[syncAllAuthorAndPublisherPercentages] formsValid:',
        formsValid,
        'authors:',
        authors.length,
        'publisher:',
        !!publisher
      );

      // CRITICAL: Need BOTH authors AND publisher for valid royalty calculation
      // If BOTH are missing, return early
      if (authors.length === 0 && !publisher) {
        console.log(
          '[syncAllAuthorAndPublisherPercentages] No authors AND no publisher, returning'
        );
        return;
      }

      // If ONLY one is missing, we can still initialize controls but set to 0
      if (authors.length === 0) {
        console.log(
          '[syncAllAuthorAndPublisherPercentages] No authors, setting publisher to 0'
        );
        if (publisher) {
          this.publisherPercentage.set(0);
        }
        return;
      }

      if (!publisher) {
        console.log(
          '[syncAllAuthorAndPublisherPercentages] No publisher, setting authors to 0'
        );
        const authorControls = this.authorPercentageControls();
        authorControls.forEach((control) => {
          if (control.value !== 0) {
            control.patchValue(0, { emitEvent: false });
          }
        });
        return;
      }

      // If we reach here, we have BOTH authors AND publisher
      console.log(
        '[syncAllAuthorAndPublisherPercentages] Have both authors and publisher, proceeding with sync'
      );

      // Step 1: Ensure author controls exist
      if (authors.length > 0) {
        const authorControls = this.authorPercentageControls();
        const hasAllAuthorControls = authors.every((author) =>
          authorControls.has(author.id)
        );
        if (!hasAllAuthorControls) {
          this.initializeAuthorPercentageControls();
        }
      }

      // Step 2: Sync FROM royalties FIRST (load saved values like 80, not defaults like 100)
      // This is the source of truth - if royalties exist, use them
      // CRITICAL: This must happen before syncing TO royalties
      // CRITICAL: Do this even if forms are invalid - we want to show saved values
      if (authors.length > 0) {
        console.log(
          '[syncAllAuthorAndPublisherPercentages] Step 2: Syncing FROM royalties'
        );
        this.syncAuthorControlsFromRoyalties();
      }

      // Step 3: Sync TO royalties (ensure all platforms have same percentage)
      // This ensures consistency across platforms
      // Only do this if forms are valid (don't create new royalties when invalid)
      if (authors.length > 0 && formsValid) {
        console.log(
          '[syncAllAuthorAndPublisherPercentages] Step 3: Syncing TO royalties'
        );
        this.syncAuthorPercentagesToRoyalties();
      }

      // Step 4: Calculate publisher percentage (based on author percentages)
      // Calculate even if forms are invalid - publisher percentage is based on author percentages, not pricing
      if (publisher) {
        console.log(
          '[syncAllAuthorAndPublisherPercentages] Step 4: Calculating publisher percentage'
        );
        this.calculatePublisherPercentage();
      }
    } finally {
      this.isSyncing = false;
      console.log('[syncAllAuthorAndPublisherPercentages] END');
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

    // Since we use emitEvent: false, we need to manually trigger update
    // But only do this if forms are valid to avoid unnecessary calls
    if (this.areFormsValid()) {
      // Use a small delay to batch multiple sync operations
      setTimeout(() => {
        // Only update if forms are still valid (avoid race conditions)
        if (this.areFormsValid()) {
          this.updateRoyaltyAmounts();
        }
      }, 200);
    }
  }

  /**
   * Calculate publisher percentage automatically
   * Publisher gets: 100 - sum of all author percentages
   */
  private calculatePublisherPercentage(): void {
    console.log('[calculatePublisherPercentage] START');
    const publisher = this.publisher();
    if (!publisher) {
      console.log('[calculatePublisherPercentage] No publisher, returning');
      return; // No publisher, nothing to calculate
    }

    // CRITICAL: Need authors for valid royalty calculation
    // If no authors, publisher should get 0% (not 100%)
    const authors = this.authors();
    if (!authors || authors.length === 0) {
      console.log(
        '[calculatePublisherPercentage] No authors, setting publisher to 0%'
      );
      this.publisherPercentage.set(0);
      return;
    }

    // CRITICAL FIX: Calculate publisher percentage even if forms are invalid
    // Publisher percentage is based on author percentages, not pricing validity
    // We want to show the calculated percentage even when some pricing is missing
    const formsValid = this.areFormsValid();
    console.log('[calculatePublisherPercentage] formsValid:', formsValid);

    const authorControls = this.authorPercentageControls();
    let totalAuthorPercentage = 0;

    authorControls.forEach((control) => {
      const value = control.value;
      if (value !== null && !isNaN(Number(value))) {
        totalAuthorPercentage += Number(value);
      }
    });

    // Round to avoid floating point precision issues
    // If authors total 100% or more, publisher gets exactly 0%
    const roundedTotalAuthor = Math.round(totalAuthorPercentage * 100) / 100;
    const publisherPercentage =
      roundedTotalAuthor >= 100
        ? 0
        : Math.max(0, Math.round((100 - roundedTotalAuthor) * 100) / 100);
    // Round to whole number for display consistency
    const roundedPublisherPercentage = Math.round(publisherPercentage);
    this.publisherPercentage.set(roundedPublisherPercentage);

    // Sync publisher percentage to all platform royalties
    // CRITICAL: Use ALL platforms that have royalties, not just displayed ones
    // This ensures publisher percentage is set even for admin-only platforms
    const accessLevel = this.accessLevel();
    let platforms: string[];

    if (accessLevel === 'SUPERADMIN') {
      // Superadmin: Get all platforms that have royalties or are in displayed columns
      const displayedPlatforms = this.displayedColumns();
      const platformsWithRoyalties = new Set(
        this.royaltiesController()
          .controls.map((r) => r.controls.platform.value)
          .filter((p): p is string => p !== null)
      );
      platforms = Array.from(
        new Set([...displayedPlatforms, ...platformsWithRoyalties])
      );
      console.log(
        '[calculatePublisherPercentage] SUPERADMIN: Using all platforms:',
        platforms
      );
    } else {
      // Publisher: Only use displayed platforms
      platforms = this.displayedColumns();
      console.log(
        '[calculatePublisherPercentage] PUBLISHER: Using displayed platforms:',
        platforms
      );
    }

    if (platforms.length === 0) {
      console.log('[calculatePublisherPercentage] No platforms available');
      return; // No platforms available yet
    }

    platforms.forEach((platform) => {
      let royaltyControl = this.royaltiesController().controls.find(
        (r) =>
          r.controls.publisherId.value === publisher.id &&
          r.controls.platform.value === platform
      );

      // Use rounded publisher percentage from signal to avoid precision issues
      const roundedPublisherPercentage = Math.round(this.publisherPercentage());

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
          percentage: new FormControl<number | null>(
            roundedPublisherPercentage,
            [Validators.required]
          ),
          titleId: new FormControl<number | null>(
            this.royaltiesController().at(0)?.controls.titleId.value || null
          ),
        });

        this.royaltiesController().push(royaltyControl);
      } else {
        // Update existing control - always update to ensure it matches calculated value
        royaltyControl.controls.percentage.patchValue(
          roundedPublisherPercentage,
          {
            emitEvent: false,
          }
        );
      }
    });
    console.log(
      '[calculatePublisherPercentage] END, percentage:',
      roundedPublisherPercentage
    );
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
          // Round to 2 decimal places to avoid floating point precision issues
          const total = data
            .filter((d) => d.platform === platform.name)
            .reduce((a, { percentage }) => a + (percentage || 0), 0);
          temp[platform.name] = Math.round(total * 100) / 100;
        });
        this.totalRoyalties.set(temp);
        this.validateTotalRoyalties();
      });
  }

  /**
   * Validate that total royalties don't exceed 100% per platform
   * Uses a small tolerance (0.01) to account for floating point precision issues
   */
  private validateTotalRoyalties(): void {
    Object.keys(this.totalRoyalties()).forEach((key) => {
      const val = (this.totalRoyalties() as any)[key] as number;
      // Use tolerance of 0.01 to account for floating point precision issues
      // This allows for values like 100.005 to be considered valid (rounded to 100.01)
      if (val > 100.01) {
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
      .pipe(debounceTime(800), takeUntil(this.destroy$))
      .subscribe(() => {
        // CRITICAL FIX: Always calculate royalties if there are platforms with both pricing and royalties
        // Don't wait for all forms to be valid - calculate for available platforms
        // This ensures royalties are shown even when some platforms are missing pricing
        this.updateRoyaltyAmounts();
      });

    // Setup subscription to track pricing validity for publishers
    // This updates the signal reactively when form validity changes
    const pricingControls = this.pricingControls();
    const statusChangesArray = pricingControls.controls.map((control) =>
      combineLatest([
        control.statusChanges,
        control.controls.mrp.statusChanges,
        control.controls.salesPrice.statusChanges,
      ])
    );

    if (statusChangesArray.length > 0) {
      combineLatest([
        pricingControls.statusChanges,
        pricingControls.valueChanges,
        ...statusChangesArray,
      ])
        .pipe(debounceTime(100), takeUntil(this.destroy$))
        .subscribe(() => {
          const accessLevel = this.accessLevel();
          if (accessLevel === 'PUBLISHER') {
            const isValid = this.checkPricingValidityForPublisher();
            this.pricingValidityForPublisher.set(isValid);
          }
        });
    }

    // Also subscribe to valueChanges as a fallback
    pricingControls.valueChanges
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => {
        const accessLevel = this.accessLevel();
        if (accessLevel === 'PUBLISHER') {
          const isValid = this.checkPricingValidityForPublisher();
          this.pricingValidityForPublisher.set(isValid);
        }
      });

    // Initial check for publishers - run after a delay to ensure all data is loaded
    const accessLevel = this.accessLevel();
    if (accessLevel === 'PUBLISHER') {
      // Run multiple checks to ensure validity is updated after data loads
      setTimeout(() => {
        const isValid = this.checkPricingValidityForPublisher();
        this.pricingValidityForPublisher.set(isValid);
      }, 200);

      // Also check after a longer delay to catch late-loading data
      setTimeout(() => {
        const isValid = this.checkPricingValidityForPublisher();
        this.pricingValidityForPublisher.set(isValid);
      }, 800);
    }

    // Add an effect to watch pricing controls and update validity for publishers
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const accessLevel = this.accessLevel();
        if (accessLevel === 'PUBLISHER') {
          // Access pricing controls to make effect reactive
          const pricingControls = this.pricingControls();
          const displayedPlatforms = this.displayedColumns();

          // Trigger validity check when pricing controls or displayed platforms change
          setTimeout(() => {
            const isValid = this.checkPricingValidityForPublisher();
            this.pricingValidityForPublisher.set(isValid);
          }, 100);
        }
      });
    });

    // Note: Disabled state is now handled by the effect() above
    // This subscription is no longer needed as the effect handles all cases

    // Watch for changes in printing price or custom print cost
    // Use effect to watch signal changes
    runInInjectionContext(this.injector, () => {
      effect(() => {
        // Access signals to trigger effect
        const printingPrice = this.printingPrice();
        const customPrintCost = this.customPrintCost();

        // Subscription will handle recalculation when printing costs change
        // No need to manually call here
      });

      // Effect to disable/enable pricing controls based on user access level
      effect(() => {
        const accessLevel = this.accessLevel();
        const pricingControls = this.pricingControls();
        const platforms = this.platformService.platforms();

        // Default: enable all controls unless explicitly should be disabled
        const controls = pricingControls.controls;

        // If access level not set yet, ensure all controls are enabled
        if (!accessLevel) {
          controls.forEach((control) => {
            if (control.controls.mrp.disabled) {
              control.controls.mrp.enable({ emitEvent: false });
            }
            if (control.controls.salesPrice.disabled) {
              control.controls.salesPrice.enable({ emitEvent: false });
            }
          });
          return;
        }

        // If platforms aren't loaded yet, ensure all controls are enabled
        if (!platforms || platforms.length === 0) {
          controls.forEach((control) => {
            if (control.controls.mrp.disabled) {
              control.controls.mrp.enable({ emitEvent: false });
            }
            if (control.controls.salesPrice.disabled) {
              control.controls.salesPrice.enable({ emitEvent: false });
            }
          });
          return;
        }

        // Process each control
        controls.forEach((control) => {
          // Access control values to make effect reactive
          const platform = control.controls.platform.value;
          const id = control.controls.id.value;
          const salesPrice = control.controls.salesPrice.value;
          const mrp = control.controls.mrp.value;

          // Only check if should disable for publishers
          const shouldDisable =
            accessLevel === 'PUBLISHER'
              ? this.isPricingDisabled(control)
              : false;

          // Check current disabled state
          const mrpDisabled = control.controls.mrp.disabled;
          const salesPriceDisabled = control.controls.salesPrice.disabled;

          if (shouldDisable) {
            // Need to disable - store original values first if not already stored
            if (!mrpDisabled) {
              if (!this.disabledControlValues.has(control.controls.mrp)) {
                this.disabledControlValues.set(control.controls.mrp, mrp);
              }
              control.controls.mrp.disable({ emitEvent: false });
            }
            if (!salesPriceDisabled) {
              if (
                !this.disabledControlValues.has(control.controls.salesPrice)
              ) {
                this.disabledControlValues.set(
                  control.controls.salesPrice,
                  salesPrice
                );
              }
              control.controls.salesPrice.disable({ emitEvent: false });
            }

            // Restore original values if changed
            const originalMrp = this.disabledControlValues.get(
              control.controls.mrp
            );
            const originalSalesPrice = this.disabledControlValues.get(
              control.controls.salesPrice
            );

            if (
              originalMrp !== undefined &&
              control.controls.mrp.value !== originalMrp
            ) {
              control.controls.mrp.setValue(originalMrp, { emitEvent: false });
            }
            if (
              originalSalesPrice !== undefined &&
              control.controls.salesPrice.value !== originalSalesPrice
            ) {
              control.controls.salesPrice.setValue(originalSalesPrice, {
                emitEvent: false,
              });
            }
          } else {
            // Should be enabled - enable if currently disabled
            if (mrpDisabled) {
              this.disabledControlValues.delete(control.controls.mrp);
              control.controls.mrp.enable({ emitEvent: false });
            }
            if (salesPriceDisabled) {
              this.disabledControlValues.delete(control.controls.salesPrice);
              control.controls.salesPrice.enable({ emitEvent: false });
            }
          }
        });
      });
    });

    // Initial calculation will be handled by subscription after forms are valid
    // No need for manual call here
  }

  /**
   * Manually calculate and update royalty amounts using centralized API
   * This is called when royalties are updated with emitEvent: false
   */
  private async updateRoyaltyAmounts(): Promise<void> {
    console.log('[updateRoyaltyAmounts] START');
    const data = this.royaltiesController().value;
    const pricingData = this.pricingControls().value;
    console.log(
      '[updateRoyaltyAmounts] Royalties:',
      data.length,
      'Pricing:',
      pricingData.length
    );

    // Group by platform: collect price and all unique percentages
    const platformMap = new Map<
      string,
      { price: number; percentages: Set<string> }
    >();

    // First, collect all platforms and their Sales Price (this is what customers actually pay)
    // CRITICAL: Only collect platforms that have valid pricing (salesPrice > 0)
    pricingData.forEach((pricing) => {
      if (!pricing.platform || !pricing.salesPrice || pricing.salesPrice <= 0)
        return;

      const platform = pricing.platform;
      const salesPrice = pricing.salesPrice; // Use Sales Price for royalty calculation

      if (!platformMap.has(platform)) {
        platformMap.set(platform, {
          price: salesPrice,
          percentages: new Set(),
        });
      } else {
        platformMap.get(platform)!.price = salesPrice;
      }
    });

    // Collect all percentages for each platform
    // CRITICAL FIX: Only add percentages for platforms that already have pricing
    // This ensures we only calculate for platforms with BOTH pricing AND royalties
    // Skip platforms that are missing pricing (they'll show 0 in the table, which is correct)
    data.forEach(({ percentage, platform }) => {
      if (!platform || percentage === null || percentage === undefined) return;

      const platformData = platformMap.get(platform);
      if (platformData && platformData.price > 0) {
        // Only add percentage if platform has valid pricing
        platformData.percentages.add(percentage.toString());
      }
      // If platform doesn't have pricing, skip it - don't add to platformMap
      // This ensures we only calculate for platforms with both pricing and royalties
    });

    // Prepare API request - one item per platform with all percentages
    const apiItems: Array<{
      platform: string;
      price: number;
      division: string[];
    }> = [];

    // CRITICAL: Only include platforms that have BOTH pricing (price > 0) AND royalties (percentages > 0)
    platformMap.forEach((platformData, platform) => {
      if (platformData.price > 0 && platformData.percentages.size > 0) {
        apiItems.push({
          platform,
          price: platformData.price,
          division: Array.from(platformData.percentages).sort(),
        });
        console.log(
          `[updateRoyaltyAmounts] Including platform ${platform} with price ${platformData.price} and ${platformData.percentages.size} percentages`
        );
      } else {
        console.log(
          `[updateRoyaltyAmounts] Skipping platform ${platform} - price: ${platformData.price}, percentages: ${platformData.percentages.size}`
        );
      }
    });

    // CRITICAL: Even if no platforms have both pricing and royalties,
    // we should still initialize the structure so platforms without pricing show 0
    if (apiItems.length === 0) {
      console.log(
        '[updateRoyaltyAmounts] No platforms with both pricing and royalties'
      );
      // Initialize structure with 0 for all platforms that have royalties
      const temp: Record<string, Partial<Record<string, number>>> = {};
      data.forEach(({ authorId, publisherId, percentage, platform }) => {
        if (!platform || percentage === null || percentage === undefined)
          return;

        const key = authorId ? 'author' + authorId : 'publisher' + publisherId;
        if (!temp[key]) {
          temp[key] = {};
        }
        // Set to 0 for platforms without pricing
        temp[key][platform] = 0;
      });
      this.totalRoyaltiesAmount.set(temp);
      return;
    }

    try {
      // Call centralized API with actual printing price (not custom)
      // Custom print cost margin is calculated separately for display
      const response = await this.royaltyService.calculateRoyalties({
        items: apiItems,
        printingPrice: this.customPrintCost() || this.printingPrice() || 0, // Use actual print cost for calculations
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

      // CRITICAL: Only set amounts for platforms that were calculated (have pricing)
      // Platforms without pricing will show 0 (which is correct)
      data.forEach(
        ({
          authorId,
          publisherId: royaltyPublisherId,
          percentage,
          platform,
        }) => {
          if (!platform || percentage === null || percentage === undefined)
            return;

          const key = authorId
            ? 'author' + authorId
            : 'publisher' + royaltyPublisherId;

          if (!temp[key]) {
            temp[key] = {};
          }

          // Only get amount if platform was included in calculation (has pricing)
          const divisionValue = platformDivisionMap.get(platform);
          let baseAmount = 0;
          if (divisionValue) {
            // Platform has pricing and was calculated
            baseAmount = divisionValue[percentage.toString()] || 0;
          } else {
            // Platform doesn't have pricing - show 0
            baseAmount = 0;
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
        }
      );

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
   * Returns 0 and disabled if forms are not valid
   */
  getAuthorPercentageControl(authorId: number): FormControl<number | null> {
    // CRITICAL: Don't add any logic here that triggers change detection
    // This getter is called on every change detection cycle from the template
    // Just return the control - sync happens through effects/subscriptions
    const controls = this.authorPercentageControls();
    let control = controls.get(authorId);

    // If control doesn't exist, create it (this should rarely happen as controls are initialized)
    if (!control) {
      const formsValid = this.areFormsValid();
      const accessLevel = this.accessLevel();
      // Check if author exists
      const author = this.authors().find((a) => a.id === authorId);
      if (author) {
        // CRITICAL FIX: Always check for existing royalties first, regardless of form validity
        let initialValue = 0;

        // Check for existing royalties - always do this, even if forms are invalid
        let authorRoyalties;
        if (accessLevel === 'SUPERADMIN') {
          // Superadmin can see all royalties
          authorRoyalties = this.royaltiesController().controls.filter(
            (r) =>
              r.controls.authorId.value === authorId &&
              r.controls.platform.value &&
              r.controls.percentage.value !== null &&
              r.controls.percentage.value !== undefined
          );
          console.log(
            `[getAuthorPercentageControl] Author ${authorId} (SUPERADMIN): Found ${authorRoyalties.length} royalties`
          );
        } else {
          // Publisher only sees visible platforms
          const displayedPlatforms = this.displayedColumns();
          const displayedSet = new Set(displayedPlatforms);
          authorRoyalties = this.royaltiesController().controls.filter(
            (r) =>
              r.controls.authorId.value === authorId &&
              r.controls.platform.value &&
              displayedSet.has(r.controls.platform.value) &&
              r.controls.percentage.value !== null &&
              r.controls.percentage.value !== undefined
          );
          console.log(
            `[getAuthorPercentageControl] Author ${authorId} (PUBLISHER): Found ${authorRoyalties.length} royalties`
          );
        }

        // Use ANY existing royalty value (even 0) if royalties exist
        if (authorRoyalties.length > 0) {
          const existingRoyalty =
            authorRoyalties.find(
              (r) =>
                r.controls.percentage.value !== 0 &&
                r.controls.percentage.value !== null
            ) || authorRoyalties[0]; // Use first one if all are 0

          if (existingRoyalty) {
            const royaltyValue = existingRoyalty.controls.percentage.value;
            if (royaltyValue !== null && royaltyValue !== undefined) {
              initialValue = royaltyValue;
              console.log(
                `[getAuthorPercentageControl] Author ${authorId}: Using existing royalty value ${initialValue}`
              );
            }
          }
        } else {
          // CRITICAL: Need both authors AND publisher for valid royalty calculation
          // If no publisher, set to 0 (can't distribute royalties without publisher)
          const hasPublisher = this.publisher() !== null;

          if (hasPublisher) {
            // FIXED: Always use default percentage (authors get 100% by default, not 0%)
            // Authors are the creators and should get royalty by default, regardless of pricing status
            const authors = this.authors();
            const authorCount = authors.length;
            initialValue =
              authorCount > 0
                ? authorCount === 1
                  ? 100
                  : Math.round((100 / authorCount) * 100) / 100
                : 0;
            console.log(
              `[getAuthorPercentageControl] Author ${authorId}: Using default value ${initialValue}`
            );
          } else {
            // No publisher - can't calculate royalties, set to 0
            initialValue = 0;
            console.log(
              `[getAuthorPercentageControl] Author ${authorId}: No publisher, setting to 0`
            );
          }
        }

        control = new FormControl<number | null>(Math.round(initialValue), [
          Validators.required,
          Validators.min(0),
          Validators.max(100),
        ]);

        // CRITICAL FIX: Always keep controls enabled
        // This allows users to see and edit saved values even when some pricing is missing
        console.log(
          `[getAuthorPercentageControl] Author ${authorId}: Control created with value ${
            control.value
          }, enabled=${!control.disabled}`
        );

        // Store control in the map
        controls.set(authorId, control);

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
              // Subscription will handle updateRoyaltyAmounts
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

    // CRITICAL: Don't modify control in getter - this causes infinite loops
    // The getter is called on every change detection cycle
    // All control updates (enable/disable, value changes) should happen in effects/subscriptions
    // Just return the control as-is

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
   * For publishers: completely hide superadmin-only platforms (never show them in pricing section)
   */
  visiblePricingControls(): PricingGroup[] {
    const allowedPlatforms = this.displayedColumns();
    const accessLevel = this.accessLevel();
    const isPublisher = accessLevel === 'PUBLISHER';

    if (!allowedPlatforms.length) {
      return this.pricingControls().controls;
    }

    const allowedSet = new Set<string>(allowedPlatforms);

    return this.pricingControls().controls.filter((control) => {
      const platform = control.controls.platform.value as string | null;
      if (!platform) {
        return true;
      }

      // Check if platform is in allowed list
      if (!allowedSet.has(platform)) {
        return false;
      }

      // For publishers, completely hide superadmin-only platforms from pricing section
      if (isPublisher) {
        const platformData = this.platformService.getPlatformByName(platform);
        if (platformData?.isSuperAdminPricingOnly) {
          return false; // Never show superadmin-only platforms to publishers in pricing
        }
      }

      return true;
    });
  }

  /**
   * Check if pricing control should be disabled for the current user
   * Publishers cannot edit superadmin-only pricing that already exists
   */
  isPricingDisabled(control: PricingGroup): boolean {
    const accessLevel = this.accessLevel();
    const isPublisher = accessLevel === 'PUBLISHER';

    // Superadmins can always edit
    if (!isPublisher) {
      return false;
    }

    const platform = control.controls.platform.value as string | null;
    if (!platform) {
      return false;
    }

    // Get platform data - if not found, don't disable (allow editing)
    const platformData = this.platformService.getPlatformByName(platform);
    if (!platformData) {
      return false; // Platform not found, don't disable
    }

    // Only disable if platform is superadmin-only AND pricing exists
    if (!platformData.isSuperAdminPricingOnly) {
      return false; // Not a superadmin-only platform, allow editing
    }

    // Only disable if pricing exists (has id or has values)
    // This means superadmin has already set the pricing
    const hasPricing =
      control.controls.id.value != null ||
      (control.controls.salesPrice.value != null &&
        control.controls.salesPrice.value !== 0) ||
      (control.controls.mrp.value != null && control.controls.mrp.value !== 0);
    return hasPricing;
  }

  isEbookPlatform(platform: string | null | undefined): boolean {
    if (!platform) {
      return false;
    }
    const platformData = this.platformService.getPlatformByName(platform);
    return platformData?.isEbookPlatform ?? false;
  }

  /**
   * Check if platform is superadmin pricing only
   */
  isSuperAdminPricingOnly(platform: string | null | undefined): boolean {
    if (!platform) {
      return false;
    }
    const platformData = this.platformService.getPlatformByName(platform);
    return platformData?.isSuperAdminPricingOnly ?? false;
  }

  /**
   * Check if royalty should show N/A for publisher
   * Show N/A only if platform is superadmin-only AND pricing doesn't exist yet
   */
  shouldShowRoyaltyNA(platform: string | null | undefined): boolean {
    const accessLevel = this.accessLevel();
    const isPublisher = accessLevel === 'PUBLISHER';

    if (!isPublisher) {
      return false; // Superadmins always see royalty amounts
    }

    if (!this.isSuperAdminPricingOnly(platform)) {
      return false; // Not a superadmin-only platform
    }

    // Check if pricing exists for this platform
    const pricingControl = this.pricingControls().controls.find(
      (control) => control.controls.platform.value === platform
    );

    if (!pricingControl) {
      return true; // No pricing control found, show N/A
    }

    // Check if pricing has been set (has id or has values)
    const hasPricing =
      pricingControl.controls.id.value != null ||
      pricingControl.controls.salesPrice.value != null ||
      pricingControl.controls.mrp.value != null;

    // Show N/A only if pricing doesn't exist yet
    return !hasPricing;
  }
  getTotalRevenue(): number {
    let revenue = 0;
    const pricing = this.pricingControls().value;
    pricing.forEach((p) => (revenue += Number(p?.mrp ?? 0)));
    return revenue;
  }

  /**
   * Setup "Same as MRP" feature
   * When checkbox is checked, automatically sync Sales Price to match MRP
   */
  private setupSameAsMrpSync(): void {
    this.pricingControls().controls.forEach((control) => {
      // Watch MRP changes - if checkbox is checked, update Sales Price
      control.controls.mrp.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((mrp) => {
          const isSameAsMrp = control.controls.isSameAsMrp?.value;
          if (isSameAsMrp && !control.controls.salesPrice.disabled) {
            control.controls.salesPrice.setValue(mrp, { emitEvent: false });
          }
        });

      // Watch checkbox changes
      control.controls.isSameAsMrp?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((isSame) => {
          if (isSame) {
            // Copy MRP to Sales Price when checked
            const mrp = control.controls.mrp.value;
            if (!control.controls.salesPrice.disabled) {
              control.controls.salesPrice.setValue(mrp, { emitEvent: false });
            }
          }
        });
    });
  }

  /**
   * Check if sales price equals MRP for a platform
   * Uses the form control value directly
   */
  isSalesPriceSameAsMrp(control: PricingGroup): boolean {
    return control.controls.isSameAsMrp?.value ?? false;
  }
}
