import {
  Component,
  computed,
  effect,
  input,
  OnDestroy,
  OnInit,
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
} from '../../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { RoyaltyFormGroup } from '../../../interfaces/Royalty';
import { combineLatest, debounceTime, Subject, takeUntil } from 'rxjs';
import { StaticValuesService } from '../../../services/static-values';

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

  constructor(private staticValueService: StaticValuesService) {}

  // Pricing inputs
  pricingControls = input.required<FormArray<PricingGroup>>();
  msp = input.required<number>();
  printingPrice = input.required<number | null>();

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
    return Object.keys(
      this.staticValueService.staticValues()?.PlatForm || {}
    ) as PlatForm[];
  });

  // Author percentage form controls (one per author)
  authorPercentageControls = signal<Map<number, FormControl<number | null>>>(
    new Map()
  );

  // Publisher percentage (calculated automatically)
  publisherPercentage = signal<number>(0);

  // Total royalties per platform
  totalRoyalties = signal<Partial<Record<PlatForm, number>>>({});

  // Royalty amount calculations
  totalRoyaltiesAmount = signal<
    Record<string, Partial<Record<PlatForm, number>> | undefined>
  >({});

  ngOnInit() {
    // Setup reactive calculations first
    this.calculateTotalRoyalties();
    this.calculateRoyaltyAmountPerPerson();

    // Initialize author percentage controls from existing royalties
    this.initializeAuthorPercentageControls();

    // Setup effect to watch for author changes and re-initialize controls
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

    // Initial sync
    setTimeout(() => {
      this.syncAuthorPercentagesToRoyalties();
      this.calculatePublisherPercentage();
    }, 100);
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

    // If authors exist but no royalties initialized yet, trigger initial sync
    if (authors.length > 0) {
      const hasAnyRoyalties = this.royaltiesController().controls.some(
        (r) => r.controls.authorId.value || r.controls.publisherId.value
      );

      if (!hasAnyRoyalties) {
        // No royalties exist yet, initialize them
        setTimeout(() => {
          this.syncAuthorPercentagesToRoyalties();
          this.calculatePublisherPercentage();
        }, 200);
      } else {
        // Royalties exist, just sync the author percentages to ensure consistency
        setTimeout(() => {
          this.syncAuthorPercentagesToRoyalties();
          this.calculatePublisherPercentage();
        }, 100);
      }
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
            platform: new FormControl<PlatForm | null>(platform),
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
  }

  /**
   * Calculate publisher percentage automatically
   * Publisher gets: 100 - sum of all author percentages
   */
  private calculatePublisherPercentage(): void {
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
    const publisher = this.publisher();
    if (publisher) {
      const platforms = this.displayedColumns();

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
            platform: new FormControl<PlatForm | null>(platform),
            percentage: new FormControl<number | null>(publisherPercentage, [
              Validators.required,
            ]),
            titleId: new FormControl<number | null>(
              this.royaltiesController().at(0)?.controls.titleId.value || null
            ),
          });

          this.royaltiesController().push(royaltyControl);
        } else {
          // Update existing control
          royaltyControl.controls.percentage.patchValue(publisherPercentage, {
            emitEvent: false,
          });
        }
      });
    }
  }

  /**
   * Calculate total royalties per platform
   */
  private calculateTotalRoyalties(): void {
    this.royaltiesController()
      .valueChanges.pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe((data) => {
        const temp: Partial<Record<PlatForm, number>> = {};
        Object.keys(
          this.staticValueService.staticValues()?.PlatForm || {}
        ).forEach((platform) => {
          temp[platform as PlatForm] = data
            .filter((d) => d.platform === platform)
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
   */
  private calculateRoyaltyAmountPerPerson(): void {
    combineLatest([
      this.royaltiesController().valueChanges,
      this.pricingControls().valueChanges,
    ])
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(([data]) => {
        const temp: Record<string, Partial<Record<PlatForm, number>>> = {};

        // Ebook platforms: MAH_EBOOK, KINDLE, GOOGLE_PLAY
        const ebookPlatforms: PlatForm[] = [
          PlatForm.MAH_EBOOK,
          PlatForm.KINDLE,
          PlatForm.GOOGLE_PLAY,
        ];

        data.forEach(({ authorId, publisherId, percentage, platform }) => {
          const key = authorId
            ? 'author' + authorId
            : 'publisher' + publisherId;

          if (!temp[key]) {
            temp[key] = {};
          }

          const salesPrice = this.pricingControls().controls.find(
            ({ controls }) => controls.platform.value === platform
          )?.controls.salesPrice?.value;

          // For ebook platforms, don't subtract printing cost
          // For other platforms, subtract printing cost
          const isEbookPlatform = ebookPlatforms.includes(platform as PlatForm);
          const printingCost = isEbookPlatform ? 0 : this.printingPrice() || 0;

          temp[key][platform as PlatForm] = Number(
            percentage && salesPrice
              ? ((salesPrice - printingCost) * (percentage / 100)).toFixed(2)
              : 0
          );
        });

        this.totalRoyaltiesAmount.set(temp);
      });
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
            });
        }

        // Add to map
        const newControls = new Map(controls);
        newControls.set(authorId, control);
        this.authorPercentageControls.set(newControls);
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
}
