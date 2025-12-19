import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  QueryList,
  Signal,
  signal,
  ViewChild,
  viewChild,
  ViewChildren,
} from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  startWith,
  Subject,
  takeUntil,
} from 'rxjs';
import { StepperOrientation } from '@angular/cdk/stepper';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
  FormControl,
} from '@angular/forms';
import {
  MatStepper,
  MatStepperIntl,
  MatStepperModule,
} from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import {
  Author,
  AuthorFormGroup,
  AuthorStatus,
  BookBindings,
  DistributionType,
  LaminationType,
  PaperType,
  PlatForm,
  PricingCreate,
  PricingGroup,
  PrintingCreate,
  PrintingFormGroup,
  PublisherFormGroup,
  Publishers,
  PublisherStatus,
  PublishingType,
  RoyaltyFormGroup,
  Title,
  TitleCreate,
  TitleDetailsFormGroup,
  TitleDistributionGroup,
  TitleFormGroup,
  TitleMedia,
  TitleMediaGroup,
  TitleMediaType,
  TitlePricing,
  TitlePrintingCostPayload,
  TitleStatus,
  UpdateRoyalty,
  User,
} from '../../interfaces';
import { MatSelectModule } from '@angular/material/select';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../services/printing-service';
import { TempTitlePrinting } from './temp-title-printing/temp-title-printing';
import { TempRoyalties } from './temp-royalties/temp-royalties';
import { TitleService } from '../titles/title-service';
import { TempBookDetails } from './temp-book-details/temp-book-details';
import { TempPricing } from './temp-pricing/temp-pricing';
import { TempPricingRoyalty } from './temp-pricing-royalty/temp-pricing-royalty';
import { TempTitleDistribution } from './temp-title-distribution/temp-title-distribution';
import Swal from 'sweetalert2';
import { getFileSizeFromS3Url, getFileToBase64 } from '../../common/utils/file';
import { formatIsbn13 } from '../../common/utils/isbn';
import { TranslateService } from '@ngx-translate/core';
import { StaticValuesService } from '../../services/static-values';
import { Back } from '../../components/back/back';
import { UserService } from '../../services/user';
import { PlatformService } from '../../services/platform';
import { cleanIsbn } from 'src/app/shared/utils/isbn.utils';
import { format } from 'date-fns';

@Component({
  selector: 'app-title-form-temp',
  providers: [{ provide: MatStepperIntl, useClass: MatStepperIntl }],
  imports: [
    MatRadioModule,
    FormsModule,
    MatStepperModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    SharedModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatCardModule,
    TempTitlePrinting,
    TempBookDetails,
    TempPricingRoyalty,
    TempTitleDistribution,
    Back,
  ],
  templateUrl: './title-form-temp.html',
  styleUrl: './title-form-temp.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleFormTemp implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  private isPrefillingRoyalties = false; // Flag to prevent mapRoyaltiesArray from overriding during prefill

  constructor(
    private printingService: PrintingService,
    private titleService: TitleService,
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService,
    private staticValuesService: StaticValuesService,
    private cdr: ChangeDetectorRef,
    userService: UserService
  ) {
    this.loggedInUser = userService.loggedInUser$;
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));

    // Handle route params with proper cleanup
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ titleId }) => {
        const parsedId = Number(titleId);
        // Validate titleId is a valid number
        this.titleId = isNaN(parsedId) || parsedId <= 0 ? 0 : parsedId;
        this.isNewTitle = !this.titleId;
      });

    // Setup stepper step tracking after component initialization
    // This will be called in ngOnInit after form is ready

    effect(() => {
      // Skip if we're currently prefilling royalties to prevent overriding API values
      if (this.isPrefillingRoyalties) {
        return;
      }

      let publisher = this.publisherSignal();

      // If publisher is not set but user is a publisher, set it from logged in user
      if (
        !publisher &&
        this.loggedInUser()?.accessLevel === 'PUBLISHER' &&
        this.loggedInUser()?.publisher
      ) {
        this.publisherSignal.set(this.loggedInUser()?.publisher as Publishers);
        publisher = this.loggedInUser()?.publisher as Publishers;
      }

      const authors = this.authorsSignal();

      this.mapRoyaltiesArray(publisher, authors);
    });

    // Watch for static values changes and ensure pricing array has all platforms
    effect(() => {
      const staticValues = this.staticValueService.staticValues();
      if (staticValues?.PlatForm) {
        this.ensurePricingArrayHasAllPlatforms();
      }
    });

    // CRITICAL: Watch for changes to authorIds form array and sync authorsSignal
    // This ensures that when authors are removed or changed, old author royalties are cleaned up
    this.tempForm.controls.titleDetails.controls.authorIds.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const authorIdsArray =
          this.tempForm.controls.titleDetails.controls.authorIds;
        if (!authorIdsArray) return;

        // Get current author IDs from the form
        const currentAuthorIds = authorIdsArray.controls
          .map((control) => control.controls.id.value)
          .filter((id) => id != null && id > 0) as number[];

        // Get current authors from signal
        const currentAuthors = this.authorsSignal();

        // Check if the authors have changed
        const currentAuthorIdsFromSignal = currentAuthors.map((a) => a.id);
        const idsMatch =
          currentAuthorIds.length === currentAuthorIdsFromSignal.length &&
          currentAuthorIds.every((id) =>
            currentAuthorIdsFromSignal.includes(id)
          ) &&
          currentAuthorIdsFromSignal.every((id) =>
            currentAuthorIds.includes(id)
          );

        // Only update if authors have actually changed
        if (!idsMatch) {
          // Find author objects for the current IDs
          const updatedAuthors = currentAuthorIds
            .map((id) => {
              // First try to find in current authors signal
              const existing = currentAuthors.find((a) => a.id === id);
              if (existing) return existing;
              // If not found, try to find in authorsList
              return this.authorsList().find((a) => a.id === id);
            })
            .filter((a): a is Author => a != null);

          // Update authorsSignal to match the form array
          // This will trigger the effect that calls mapRoyaltiesArray, which will remove old author royalties
          this.authorsSignal.set(updatedAuthors);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  @ViewChild('scrollTarget') scrollTarget!: ElementRef;

  onSelectDocumentsReady() {
    this.tempForm.get('hasFiles')?.setValue(true);
    if (
      this.tempForm.controls.publishingType.value === PublishingType.ONLY_EBOOK
    ) {
      this.tempForm.controls.printingFormat.patchValue('publish&print');
      this.stepper()?.next();
      return;
    }

    // Use queueMicrotask for DOM access after change detection
    queueMicrotask(() => {
      if (this.scrollTarget?.nativeElement) {
        this.scrollTarget.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  }
  private readonly baseOrder = [
    'details',
    'documents',
    'print',
    'pricing', // Now includes both pricing and royalty
    'distribution',
  ];

  /**
   * Get the actual step order based on publishing type and whether titleId exists
   */
  private getStepOrder(): string[] {
    const publishingType = this.tempForm.controls.publishingType.value;
    const hasFormatStep = !this.titleId; // Format step only shows for new titles

    let stepOrder =
      publishingType === PublishingType.ONLY_EBOOK
        ? this.baseOrder.filter((s) => s !== 'print')
        : this.baseOrder;

    // Add format step at the beginning if it exists
    if (hasFormatStep) {
      stepOrder = ['format', ...stepOrder];
    }

    return stepOrder;
  }

  /**
   * Get step name from stepper index
   */
  private getStepNameFromIndex(index: number): string | null {
    const stepOrder = this.getStepOrder();
    if (index >= 0 && index < stepOrder.length) {
      return stepOrder[index];
    }
    return null;
  }

  /**
   * Get stepper index from step name
   */
  private getIndexFromStepName(stepName: string): number {
    const stepOrder = this.getStepOrder();
    return stepOrder.indexOf(stepName);
  }

  /**
   * Update query params with current step
   */
  private updateStepInQueryParams(stepName: string | null): void {
    const currentParams = { ...this.route.snapshot.queryParams };

    if (stepName) {
      currentParams['step'] = stepName;
    } else {
      delete currentParams['step'];
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: currentParams,
      queryParamsHandling: 'merge',
      replaceUrl: true, // Don't add to history
    });
  }

  /**
   * Move to next step after successful submission
   * Only moves if not raising a ticket
   * Uses logical step order instead of DOM order to handle conditional steps
   */
  private goToNextStep(): void {
    // Don't move to next step when raising a ticket
    if (this.isRaisingTicket()) {
      return;
    }

    const stepperInstance = this.stepper();
    if (!stepperInstance) {
      return;
    }

    // Get current step name from logical order
    const currentStepName = this.currentStep();
    const stepOrder = this.getStepOrder();

    if (!currentStepName) {
      // If no current step, try to get from stepper index
      const currentIndex = stepperInstance.selectedIndex;
      const stepName = this.getStepNameFromIndex(currentIndex);
      if (stepName) {
        this.currentStep.set(stepName);
      } else {
        return; // Can't determine current step
      }
    }

    // Find current step index in logical order
    const currentStepIndex = stepOrder.indexOf(this.currentStep() || '');
    if (currentStepIndex === -1 || currentStepIndex >= stepOrder.length - 1) {
      return; // Already at last step or step not found
    }

    // Get next step name from logical order
    const nextStepName = stepOrder[currentStepIndex + 1];
    if (!nextStepName) {
      return; // No next step
    }

    // Find the DOM index for the next step
    const nextStepIndex = this.getIndexFromStepName(nextStepName);
    if (nextStepIndex === -1) {
      return; // Step not found in DOM (shouldn't happen, but safety check)
    }

    // Use queueMicrotask to ensure stepper is ready and form state is updated
    queueMicrotask(() => {
      try {
        // Ensure current step is marked as completed if it has a stepControl
        const currentIndex = stepperInstance.selectedIndex;
        if (currentIndex >= 0 && currentIndex < stepperInstance.steps.length) {
          const currentStep = stepperInstance.steps.toArray()[currentIndex];
          if (currentStep?.stepControl) {
            // Mark as touched and ensure it's valid
            currentStep.stepControl.markAllAsTouched();
          }
        }

        // Navigate to next step by setting selectedIndex directly
        // This ensures we go to the correct step regardless of DOM order
        stepperInstance.selectedIndex = nextStepIndex;
        this.currentStep.set(nextStepName);
        this.updateStepInQueryParams(nextStepName);
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error moving to next step:', error);
        // Fallback: try using next() method
        try {
          stepperInstance.next();
          queueMicrotask(() => {
            const newIndex = stepperInstance.selectedIndex;
            const newStepName = this.getStepNameFromIndex(newIndex);
            if (newStepName) {
              this.currentStep.set(newStepName);
              this.updateStepInQueryParams(newStepName);
              this.cdr.markForCheck();
            }
          });
        } catch (fallbackError) {
          console.error('Error in fallback navigation:', fallbackError);
        }
      }
    });
  }

  /**
   * Navigate stepper to a specific step by name
   */
  private navigateStepperTo(step: string, publishingType?: string): void {
    const stepOrder = this.getStepOrder();
    const index = stepOrder.indexOf(step);

    if (index === -1) {
      return; // Step not found in current order
    }

    const stepperInstance = this.stepper();
    if (stepperInstance && index < stepperInstance.steps.length) {
      queueMicrotask(() => {
        stepperInstance.selectedIndex = index;
        this.currentStep.set(step);
        this.updateStepInQueryParams(step);
        this.cdr.markForCheck();
      });
    }
  }

  /**
   * Handle stepper selection change and update query params
   */
  private setupStepperStepTracking(): void {
    // Wait for stepper to be available and form to be initialized
    // Use afterNextRender in constructor context, but queueMicrotask here
    Promise.resolve().then(() => {
      const stepperInstance = this.stepper();
      if (!stepperInstance) {
        // Retry if stepper not ready yet
        queueMicrotask(() => this.setupStepperStepTracking());
        return;
      }

      // Listen to selection change events
      stepperInstance.selectionChange
        .pipe(takeUntil(this.destroy$))
        .subscribe((event) => {
          const stepName = this.getStepNameFromIndex(event.selectedIndex);
          if (stepName) {
            this.currentStep.set(stepName);
            this.updateStepInQueryParams(stepName);
            this.cdr.markForCheck();

            // Calculate MSP when moving to pricing step
            // This ensures MSP is calculated even if it wasn't calculated earlier
            if (stepName === 'pricing') {
              queueMicrotask(() => {
                // Force calculation when moving to pricing step
                // This handles cases where fields were filled but calculation didn't trigger
                this.calculatePrintingCost();
              });
            }
          }
        });

      // Initialize current step from query params or stepper
      const queryStep = this.route.snapshot.queryParams['step'];
      if (queryStep && typeof queryStep === 'string') {
        // Navigate to the step from query params
        const targetIndex = this.getIndexFromStepName(queryStep);
        if (targetIndex !== -1 && targetIndex < stepperInstance.steps.length) {
          stepperInstance.selectedIndex = targetIndex;
          this.currentStep.set(queryStep);
          this.cdr.markForCheck();

          // Calculate MSP if navigating to pricing step
          if (queryStep === 'pricing') {
            queueMicrotask(() => {
              // Force calculation when navigating to pricing from query params
              this.calculatePrintingCost();
            });
          }
        } else {
          // Invalid step in query params, use current stepper index
          const currentIndex = stepperInstance.selectedIndex;
          const stepName = this.getStepNameFromIndex(currentIndex);
          if (stepName) {
            this.currentStep.set(stepName);
            this.updateStepInQueryParams(stepName);
            this.cdr.markForCheck();
          }
        }
      } else {
        // No step in query params, set initial step based on current stepper index
        const currentIndex = stepperInstance.selectedIndex;
        const stepName = this.getStepNameFromIndex(currentIndex);
        if (stepName) {
          this.currentStep.set(stepName);
          this.updateStepInQueryParams(stepName);
          this.cdr.markForCheck();
        }
      }
    });
  }

  @ViewChildren('fileInput') fileInputs!: QueryList<
    ElementRef<HTMLInputElement>
  >;

  loggedInUser!: Signal<User | null>;
  staticValueService = inject(StaticValuesService);
  platformService = inject(PlatformService);
  currentStep = signal<string | null>(null);
  stepperOrientation: Observable<StepperOrientation>;
  bindingType!: BookBindings[];
  laminationTypes!: LaminationType[];
  authorsSignal = signal<Author[]>([]);
  publisherSignal = signal<Publishers | null>(null);
  titleId: number = 0;
  isNewTitle = true;
  publishers = signal<Publishers[]>([]);
  authorsList = signal<Author[]>([]);
  titleDetails = signal<Title | null>(null);

  // Computed property to check if we should show "Raise Ticket" button
  isRaisingTicket = computed(() => {
    return (
      this.titleId > 0 &&
      this.titleDetails()?.status === TitleStatus.APPROVED &&
      this.loggedInUser()?.accessLevel === 'PUBLISHER'
    );
  });

  // Signal to track if hardbound is allowed based on binding type
  private isHardBoundAllowedSignal = signal<boolean>(false);

  // Computed property to check if hardbound is allowed based on binding type
  isHardBoundAllowed = computed(() => this.isHardBoundAllowedSignal());

  private stepper = viewChild<MatStepper>('stepperForm');

  onAuthorChangeChild(authorId: number) {
    const author = this.authorsList().find((a) => a.id === authorId);
    if (!author) return;

    const current = this.authorsSignal();
    if (!current.some((a) => a.id === author.id)) {
      this.authorsSignal.set([...current, author]);
      // Update validators for newly added author - use queueMicrotask for proper timing
      queueMicrotask(() => {
        this.updateAuthorPrintPriceValidators();
        this.cdr.markForCheck();
      });
    }
  }

  onPublisherChangeChild(publisherid: number) {
    const publisher = this.publishers().find((a) => a.id === publisherid);
    if (!publisher) return;
    this.publisherSignal.set(publisher);
  }

  getDocumentLabel(mediaType?: TitleMediaType): string {
    switch (mediaType) {
      case 'FULL_COVER':
        return 'Upload Full Cover (PDF)';
      case 'INTERIOR':
        return 'Upload Print Interior (PDF)';
      case 'FRONT_COVER':
        return 'Upload Front Cover (JPG/PNG)';
      case 'BACK_COVER':
        return 'Upload Back Cover (Optional)';
      case 'INSIDE_COVER':
        return 'Upload Inside Cover';
      case 'MANUSCRIPT':
        return 'Upload Manuscript (DOCX)';
      default:
        return 'Upload File';
    }
  }

  getHelperText(mediaType: TitleMediaType | string | null): string {
    switch (mediaType) {
      case 'FullCover':
        return 'PDF, max 20MB';
      case 'PrintInterior':
        return 'PDF, max 10MB';
      case 'FrontCover':
        return 'JPG or PNG, max 2MB';
      case 'BackCover':
        return 'Optional: JPG or PNG, max 2MB';
      case 'MANUSCRIPT':
        return 'DOCX or DOC, max 50MB (Required for ebook types)';
      default:
        return '';
    }
  }

  getAcceptedTypes(mediaType: TitleMediaType | undefined): string {
    if (mediaType === 'INTERIOR' || mediaType === 'FULL_COVER')
      return 'application/pdf';
    if (mediaType === 'MANUSCRIPT')
      return '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';
    return 'image/*';
  }

  PublishingType = PublishingType;
  tempForm = new FormGroup<TitleFormGroup>({
    printingFormat: new FormControl<string | null>(null, Validators.required),
    hasFiles: new FormControl<boolean | null>(null, Validators.required),
    publishingType: new FormControl<PublishingType | null>(
      null,
      Validators.required
    ),
    titleDetails: this.createTitleDetailsGroup(),
    printing: this.createPrintingGroupTemp(),
    pricing: this.createPricingArrayTemp(),
    documentMedia: new FormArray<FormGroup<TitleMediaGroup>>([]),
    royalties: new FormArray<FormGroup<RoyaltyFormGroup>>([]),
    distribution: this.createDistributionOptions(),
  });

  async ngOnInit() {
    // Ensure static values are loaded first
    if (!this.staticValueService.staticValues()) {
      try {
        await this.staticValueService.fetchAndUpdateStaticValues();
      } catch (error) {
        console.error('Error loading static values:', error);
      }
    }

    // Ensure pricing array has all platforms after static values are loaded
    this.ensurePricingArrayHasAllPlatforms();

    const { items: bindingTypes } = await this.printingService.getBindingType();
    this.bindingType = bindingTypes;

    const { items: publishersItem } = await this.publisherService.getPublishers(
      {
        status: PublisherStatus.Active,
      }
    );
    this.publishers.set(publishersItem);

    const { items: authorItems } = await this.authorService.getAuthors({
      status: AuthorStatus.Active,
    });
    this.authorsList.set(authorItems);

    this.tempForm.controls.titleDetails.controls.publisher.controls.id.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchAndUpdatePublishingPoints();
      });

    let media: TitleMedia[] = [];
    if (this.titleId) {
      try {
        this.isLoading.set(true);
        const response = await this.titleService.getTitleById(this.titleId);

        if (!response) {
          throw new Error('Title not found');
        }

        this.titleDetails.set(response);

        // Ensure pricing array has all platforms before pre-filling
        this.ensurePricingArrayHasAllPlatforms();

        this.prefillFormData(response);
        media = Array.isArray(response?.media) ? response.media : [];
      } catch (error) {
        console.error('Error loading title:', error);
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error'),
          text:
            this.translateService.instant('errorloadingtitle') ||
            'Failed to load title. Please try again.',
        }).then(() => {
          this.router.navigate(['/titles']);
        });
        return;
      } finally {
        this.isLoading.set(false);
      }
    }

    this.calculatePrintingCost();
    await this.addDefaultMediaArray(media);
    this.handelInsideCoverMedia();

    const manageISBNRequired = (v?: PublishingType | null) => {
      if (!v) return;

      const isAddPrintValidators = v !== PublishingType.ONLY_EBOOK;
      const isAddEbookValidators = v !== PublishingType.ONLY_PRINT;

      this.tempForm.controls.titleDetails.controls.isbnEbook[
        isAddEbookValidators ? 'setValidators' : 'removeValidators'
      ](Validators.required);
      this.tempForm.controls.titleDetails.controls.isbnPrint[
        isAddPrintValidators ? 'setValidators' : 'removeValidators'
      ](Validators.required);
      this.tempForm.controls.titleDetails.controls.isbnPrint.updateValueAndValidity();
      this.tempForm.controls.titleDetails.controls.isbnEbook.updateValueAndValidity();
    };

    // Set up subscription first
    this.tempForm.controls.publishingType.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (v) => {
        manageISBNRequired(v);
        this.updatePricingValidatorsForPublishingType(v);
        // Reset distribution options when publishing type changes
        this.tempForm.setControl(
          'distribution',
          this.createDistributionOptions()
        );
        // Re-fetch points for the new distribution set (no-op for ONLY_EBOOK/MAH)
        this.fetchAndUpdatePublishingPoints();
        await this.manageManuscriptMedia(v);
      });

    // Then call it with current value to ensure validators are set correctly
    manageISBNRequired(this.tempForm.controls.publishingType.value);
    this.updatePricingValidatorsForPublishingType(
      this.tempForm.controls.publishingType.value
    );
    // Initialize MANUSCRIPT media based on current publishing type
    // Note: This is called after addDefaultMediaArray completes to ensure proper initialization
    await this.manageManuscriptMedia(
      this.tempForm.controls.publishingType.value
    );

    this.tempForm.controls.printing.controls.bookBindingsId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const isHardBound = this.bindingType
          .find(({ id }) => id === value)
          ?.name.toLowerCase()
          .includes('hardbound');

        // Update the signal for hardbound allowed state
        this.isHardBoundAllowedSignal.set(isHardBound ?? false);

        const hardBoundController =
          this.tempForm.controls.distribution.controls.find(
            ({ controls: { type } }) =>
              type.value === DistributionType.Hardbound_National
          );
        if (isHardBound) {
          if (!hardBoundController) {
            this.tempForm.controls.distribution.insert(
              0,
              new FormGroup<TitleDistributionGroup>({
                id: new FormControl<number | null>(null),
                isSelected: new FormControl(false, { nonNullable: true }),
                type: new FormControl(DistributionType.Hardbound_National, {
                  nonNullable: true,
                }),
                availablePoints: new FormControl(0, { nonNullable: true }),
                name: new FormControl('Hard Bound National', {
                  nonNullable: true,
                }),
              })
            );
            this.fetchAndUpdatePublishingPoints();
          }
        } else if (hardBoundController) {
          this.tempForm.controls.distribution.removeAt(
            this.tempForm.controls.distribution.controls.indexOf(
              hardBoundController
            )
          );
        }
      });

    // Initialize hardbound allowed state based on current binding type
    const initialBookBindingsId =
      this.tempForm.controls.printing.controls.bookBindingsId.value;
    if (initialBookBindingsId && this.bindingType) {
      const isHardBound = this.bindingType
        .find(({ id }) => id === initialBookBindingsId)
        ?.name.toLowerCase()
        .includes('hardbound');
      this.isHardBoundAllowedSignal.set(isHardBound ?? false);
    }
    // Setup stepper step tracking after everything is initialized
    this.setupStepperStepTracking();
  }

  async fetchAndUpdatePublishingPoints() {
    const publisherId =
      this.tempForm.controls.titleDetails.controls.publisher.controls.id.value;

    if (!publisherId || isNaN(Number(publisherId))) {
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const { items: publishingPoints } =
        await this.publisherService.fetchPublishingPoints(publisherId);

      if (publishingPoints && Array.isArray(publishingPoints)) {
        publishingPoints.forEach(({ distributionType, availablePoints }) => {
          // MAH is free and always available for ebook-only titles
          if (distributionType === DistributionType.MAH) {
            const mahControl =
              this.tempForm.controls.distribution.controls.find(
                ({ controls: { type } }) => type.value === DistributionType.MAH
              );
            if (mahControl) {
              mahControl.controls.availablePoints.patchValue(
                Number.MAX_SAFE_INTEGER
              );
            }
            return;
          }

          const distributionController =
            this.tempForm.controls.distribution.controls.find(
              ({ controls: { type } }) => type.value === distributionType
            );

          if (distributionController && typeof availablePoints === 'number') {
            distributionController.controls.availablePoints.patchValue(
              availablePoints
            );
          }
        });
      }
    } catch (error) {
      console.error('Error fetching publishing points:', error);
      this.errorMessage.set(
        this.translateService.instant('errorfetchingpublishingpoints') ||
          'Failed to fetch publishing points. Please try again.'
      );
      // Show user-friendly error
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.errorMessage() ||
          'An error occurred while fetching publishing points.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  mapRoyaltiesArray(publisher: Publishers | null, authors: Author[]) {
    const { printing, pricing, royalties } = this.tempForm.controls;

    // Skip if we're currently prefilling royalties to prevent overriding API values
    if (this.isPrefillingRoyalties) {
      return;
    }

    // Early return if publisher or authors are missing
    if (!publisher || !Array.isArray(authors)) {
      return;
    }

    const authorIds = authors.map((a) => a.id);
    const normalizedAuthorIdsForLog = authorIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    console.log('[mapRoyaltiesArray] START', {
      publisherId: publisher?.id,
      authorCount: authors.length,
      authorIds: authorIds,
      normalizedAuthorIds: normalizedAuthorIdsForLog,
      totalRoyalties: royalties.length,
      royaltiesWithIds: royalties.controls.filter(
        (c) => (c.controls.id.value ?? c.value.id) != null
      ).length,
      publisherRoyalties: royalties.controls
        .filter((c) => {
          const pid = c.controls.publisherId.value ?? c.value.publisherId;
          return pid != null && Number(pid) === Number(publisher?.id);
        })
        .map((c) => ({
          platform: c.controls.platform.value ?? c.value.platform,
          percentage: c.controls.percentage.value ?? c.value.percentage,
          id: c.controls.id.value ?? c.value.id,
          publisherId: c.controls.publisherId.value ?? c.value.publisherId,
        })),
      allRoyalties: royalties.controls.map((c) => ({
        id: c.controls.id.value ?? c.value.id,
        publisherId: c.controls.publisherId.value ?? c.value.publisherId,
        authorId: c.controls.authorId.value ?? c.value.authorId,
        authorIdType: typeof (c.controls.authorId.value ?? c.value.authorId),
        platform: c.controls.platform.value ?? c.value.platform,
        percentage: c.controls.percentage.value ?? c.value.percentage,
      })),
    });

    // CRITICAL: If royalties with IDs already exist (from API), we need to be careful
    // We should preserve existing percentages but still handle new authors
    // Don't return early - we still need to ensure all authors have royalties
    // The logic below will preserve existing percentages when they have IDs

    // FIXED: Royalty distribution is independent of pricing validity
    // Authors should get their default percentage (100% split) regardless of whether pricing exists
    // This is because royalty % is a creative/contractual split, not dependent on actual pricing
    const isPrintingValid = printing?.valid ?? false;
    const isPricingValid = pricing?.valid ?? false;
    const hasPricing = pricing.length > 0;
    const areFormsValid = isPrintingValid && isPricingValid && hasPricing;

    // publisher and authors already validated above before START log
    const publisherId = publisher.id;

    // REMOVED: Duplicate removal logic that was incorrectly reading from control.value
    // STEP 1 below handles this properly by reading from control.controls.*.value

    // Get platform names from platform service instead of static values
    const platforms = this.platformService.getPlatformNames();

    if (!platforms.length) {
      return; // No platforms available
    }

    // 🧹 STEP 1: Remove royalties not related to current publisher or authors
    // CRITICAL: Read from form controls directly, not from value property
    // The value property might not be updated immediately after prefill

    // Normalize authorIds to numbers for reliable comparison, filter out invalid values
    // Calculate once outside the loop for efficiency
    const normalizedAuthorIds = authorIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    // Log all author royalties BEFORE removal to see what we're working with
    const authorIdsStr = authorIds.join(', ');
    const normalizedAuthorIdsStr = normalizedAuthorIds.join(', ');
    const allAuthorRoyaltiesBeforeRemoval = royalties.controls
      .map((control, index) => {
        const aid = control.controls.authorId.value ?? control.value.authorId;
        const normalizedAid =
          aid != null && !isNaN(Number(aid)) ? Number(aid) : null;
        const platform =
          control.controls.platform.value ?? control.value.platform;
        const controlId = control.controls.id.value ?? control.value.id;
        return { index, aid, normalizedAid, platform, controlId };
      })
      .filter((r) => r.normalizedAid != null);

    const authorRoyaltiesByAuthorId = allAuthorRoyaltiesBeforeRemoval.reduce(
      (acc, royalty) => {
        const aid = String(royalty.normalizedAid);
        if (!acc[aid]) acc[aid] = [];
        acc[aid].push(royalty);
        return acc;
      },
      {} as Record<string, typeof allAuthorRoyaltiesBeforeRemoval>
    );

    const authorsToRemove = Object.keys(authorRoyaltiesByAuthorId)
      .filter((aid) => !normalizedAuthorIds.includes(Number(aid)))
      .map((aid) => ({
        authorId: aid,
        count: authorRoyaltiesByAuthorId[aid].length,
        platforms: authorRoyaltiesByAuthorId[aid].map((r) => r.platform),
      }));

    const authorsToKeep = Object.keys(authorRoyaltiesByAuthorId)
      .filter((aid) => normalizedAuthorIds.includes(Number(aid)))
      .map((aid) => ({
        authorId: aid,
        count: authorRoyaltiesByAuthorId[aid].length,
        platforms: authorRoyaltiesByAuthorId[aid].map((r) => r.platform),
      }));

    console.log(
      `[mapRoyaltiesArray] STEP 1: BEFORE removal - Analyzing ${royalties.length} royalties`,
      {
        currentAuthorIds: authorIdsStr,
        currentNormalizedAuthorIds: normalizedAuthorIdsStr,
        totalAuthorRoyalties: allAuthorRoyaltiesBeforeRemoval.length,
        authorsToKeep:
          authorsToKeep.length > 0
            ? authorsToKeep
            : 'None (no author royalties yet)',
        authorsToRemove:
          authorsToRemove.length > 0
            ? authorsToRemove
            : 'None (all author royalties are valid)',
        summary:
          authorsToRemove.length > 0
            ? `Will remove ${authorsToRemove.reduce(
                (sum, a) => sum + a.count,
                0
              )} royalties for ${
                authorsToRemove.length
              } author(s) not in current list`
            : `All ${allAuthorRoyaltiesBeforeRemoval.length} author royalties are valid (will keep all)`,
        allAuthorRoyaltiesByAuthorId: Object.keys(
          authorRoyaltiesByAuthorId
        ).map((aid) => ({
          authorId: aid,
          count: authorRoyaltiesByAuthorId[aid].length,
          platforms: authorRoyaltiesByAuthorId[aid].map((r) => r.platform),
          willBeRemoved: !normalizedAuthorIds.includes(Number(aid)),
        })),
      }
    );

    let removedCount = 0;
    const beforeRemoval = royalties.length;
    for (let i = royalties.length - 1; i >= 0; i--) {
      const control = royalties.at(i);
      // Read from form controls directly (most reliable)
      const pid =
        control.controls.publisherId.value ?? control.value.publisherId;
      const aid = control.controls.authorId.value ?? control.value.authorId;
      const controlId = control.controls.id.value ?? control.value.id;

      // Normalize for comparison - handle both string and number types
      const normalizedPid = pid != null ? Number(pid) : null;
      const normalizedPublisherId =
        publisherId != null ? Number(publisherId) : null;
      const normalizedAid =
        aid != null && !isNaN(Number(aid)) ? Number(aid) : null;

      // CRITICAL: A royalty is valid if:
      // 1. It's a publisher royalty (publisherId matches and no authorId) - keep it
      // 2. It's an author royalty AND the authorId is in the current authors list - keep it
      // Otherwise, it's an old author royalty (authorId not in current list) or unrelated royalty - remove it
      const hasAuthorId = normalizedAid != null;
      const isPublisherRoyalty =
        normalizedPid === normalizedPublisherId &&
        normalizedPid != null &&
        !hasAuthorId;
      const isCurrentAuthorRoyalty =
        hasAuthorId &&
        normalizedAuthorIds.length > 0 &&
        normalizedAuthorIds.includes(normalizedAid);
      const isValid = isPublisherRoyalty || isCurrentAuthorRoyalty;

      // Log all controls for debugging - always log author royalties to see why they're kept/removed
      if (hasAuthorId) {
        const isInList =
          normalizedAuthorIds.length > 0 &&
          normalizedAuthorIds.includes(normalizedAid);
        const aidFromControl = control.controls.authorId.value;
        const aidFromValue = control.value.authorId;
        const authorIdsStr = authorIds.join(', ');
        const normalizedAuthorIdsStr = normalizedAuthorIds.join(', ');
        console.log(`[mapRoyaltiesArray] STEP 1: Checking author royalty`, {
          controlId,
          aidFromControl,
          aidFromValue,
          aid,
          normalizedAid,
          authorIds: authorIdsStr, // String representation for visibility
          normalizedAuthorIds: normalizedAuthorIdsStr, // String representation for visibility
          authorIdsArray: [...authorIds], // Spread to show actual values
          normalizedAuthorIdsArray: [...normalizedAuthorIds], // Spread to show actual values
          isInList,
          isCurrentAuthorRoyalty,
          isValid,
          willBeRemoved: !isValid,
          reason: !isValid
            ? 'authorId not in current authors list'
            : 'authorId is in current authors list',
          comparison: `Checking if ${normalizedAid} is in [${normalizedAuthorIdsStr}]`,
        });
      }

      if (!isValid) {
        const platform =
          control.controls.platform.value ?? control.value.platform;
        const authorIdsStr = authorIds.join(', ');
        const normalizedAuthorIdsStr = normalizedAuthorIds.join(', ');
        console.log(`[mapRoyaltiesArray] STEP 1: Removing unrelated royalty`, {
          controlId,
          platform,
          pid,
          normalizedPid,
          publisherId,
          normalizedPublisherId,
          aid,
          normalizedAid,
          authorIds: authorIdsStr,
          normalizedAuthorIds: normalizedAuthorIdsStr,
          hasAuthorId,
          isPublisherRoyalty,
          isCurrentAuthorRoyalty,
          isValid,
          reason: hasAuthorId
            ? `Author ${normalizedAid} is NOT in current authors list [${normalizedAuthorIdsStr}]`
            : `Not a publisher royalty and no valid authorId`,
        });
        royalties.removeAt(i);
        removedCount++;
      }
    }
    // Log all author royalties AFTER removal to verify removal worked
    const allAuthorRoyaltiesAfterRemoval = royalties.controls
      .map((control, index) => {
        const aid = control.controls.authorId.value ?? control.value.authorId;
        const normalizedAid =
          aid != null && !isNaN(Number(aid)) ? Number(aid) : null;
        const platform =
          control.controls.platform.value ?? control.value.platform;
        const controlId = control.controls.id.value ?? control.value.id;
        return { index, aid, normalizedAid, platform, controlId };
      })
      .filter((r) => r.normalizedAid != null);

    const authorRoyaltiesByAuthorIdAfter =
      allAuthorRoyaltiesAfterRemoval.reduce((acc, royalty) => {
        const aid = String(royalty.normalizedAid);
        if (!acc[aid]) acc[aid] = [];
        acc[aid].push(royalty);
        return acc;
      }, {} as Record<string, typeof allAuthorRoyaltiesAfterRemoval>);

    console.log(
      `[mapRoyaltiesArray] STEP 1: Removed ${removedCount} unrelated royalties`,
      {
        beforeRemoval,
        afterRemoval: royalties.length,
        publisherId,
        authorIds: authorIdsStr, // String for visibility
        normalizedAuthorIds: normalizedAuthorIdsStr, // String for visibility
        authorIdsArray: [...authorIds], // Array for inspection
        normalizedAuthorIdsArray: [...normalizedAuthorIds], // Array for inspection
        summary:
          removedCount > 0
            ? `Removed ${removedCount} old author royalties (authors not in current list: ${normalizedAuthorIdsStr})`
            : `All royalties are valid (current authors: ${normalizedAuthorIdsStr})`,
        authorRoyaltiesAfterRemoval: Object.keys(
          authorRoyaltiesByAuthorIdAfter
        ).map((aid) => ({
          authorId: aid,
          count: authorRoyaltiesByAuthorIdAfter[aid].length,
          platforms: authorRoyaltiesByAuthorIdAfter[aid].map((r) => r.platform),
          isCurrentAuthor: normalizedAuthorIds.includes(Number(aid)),
        })),
      }
    );

    // Calculate default author percentage: 100% if 1 author, equally divided if more than 1
    // FIXED: Authors get default percentage REGARDLESS of pricing/form validity
    // Royalty distribution is independent of pricing - authors are creators and should get royalty by default
    const authorCount = authors.length;

    const defaultAuthorPercentage: number =
      authorCount > 0
        ? authorCount === 1
          ? 100
          : Math.round((100 / authorCount) * 100) / 100 // Round to 2 decimal places
        : 0;

    // 🧱 STEP 2: Ensure publisher royalties per platform
    // Publisher gets remainder: 100% only if no authors exist, 0% if authors exist
    // FIXED: Calculate regardless of pricing/form validity
    const defaultPublisherPercentage =
      authorCount > 0
        ? 0 // Authors exist, publisher gets remainder (0% by default)
        : 100; // No authors, publisher gets everything

    for (const platform of platforms) {
      // CRITICAL: Prioritize controls with id (from API) to preserve prefilled values
      // First, try to find a control with id (prefilled from API) that matches
      // Platform might be stored as string or object, normalize for comparison
      // Get all controls with IDs for debugging
      const allControlsWithIds = royalties.controls.map((c) => {
        const idFromValue = c.value.id;
        const idFromControl = c.controls.id.value;
        const idFromRaw = c.getRawValue()?.id;
        return {
          idFromValue,
          idFromControl,
          idFromRaw,
          publisherId: c.controls.publisherId.value ?? c.value.publisherId,
          platformRaw: c.controls.platform.value ?? c.value.platform,
          platformType: typeof (c.controls.platform.value ?? c.value.platform),
          hasId:
            idFromValue != null || idFromControl != null || idFromRaw != null,
        };
      });

      console.log(
        `[mapRoyaltiesArray] STEP 2 - Platform ${platform}: Starting lookup`,
        {
          platform,
          publisherId,
          totalControls: royalties.length,
          allControlsWithIds,
        }
      );

      // CRITICAL: Check ID from form control directly (most reliable)
      let control = royalties.controls.find((ctrl) => {
        // Check ID from form control directly - this is the most reliable way
        const idFromControl = ctrl.controls.id.value;
        const hasId = idFromControl != null && idFromControl !== undefined;

        if (!hasId) return false; // Skip controls without id in first pass

        const controlPublisherId =
          ctrl.controls.publisherId.value ?? ctrl.value.publisherId;
        const controlPlatformRaw =
          ctrl.controls.platform.value ?? ctrl.value.platform;
        // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
        const controlPlatform =
          typeof controlPlatformRaw === 'object' &&
          controlPlatformRaw !== null &&
          'name' in controlPlatformRaw
            ? (controlPlatformRaw as { name: string }).name
            : String(controlPlatformRaw ?? '');

        // Normalize: convert to numbers for comparison, handle null/undefined
        const normalizedControlPublisherId =
          controlPublisherId != null ? Number(controlPublisherId) : null;
        const normalizedPublisherId =
          publisherId != null ? Number(publisherId) : null;
        // String comparison for platform (case-sensitive)
        const matches =
          normalizedControlPublisherId === normalizedPublisherId &&
          controlPlatform === platform;

        if (matches) {
          console.log(
            `[mapRoyaltiesArray] STEP 2 - Platform ${platform}: Found control with id`,
            {
              idFromControl,
              controlPublisherId,
              normalizedControlPublisherId,
              publisherId,
              normalizedPublisherId,
              controlPlatformRaw,
              controlPlatform,
              platform,
              percentage: ctrl.controls.percentage.value,
            }
          );
        }

        return matches;
      });

      // If not found, try all controls (including those without id)
      if (!control) {
        control = royalties.controls.find((ctrl) => {
          const controlPublisherId =
            ctrl.controls.publisherId.value ?? ctrl.value.publisherId;
          const controlPlatformRaw =
            ctrl.controls.platform.value ?? ctrl.value.platform;
          // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
          const controlPlatform =
            typeof controlPlatformRaw === 'object' &&
            controlPlatformRaw !== null &&
            'name' in controlPlatformRaw
              ? (controlPlatformRaw as { name: string }).name
              : String(controlPlatformRaw ?? '');
          // Normalize: convert to numbers for comparison, handle null/undefined
          const normalizedControlPublisherId =
            controlPublisherId != null ? Number(controlPublisherId) : null;
          const normalizedPublisherId =
            publisherId != null ? Number(publisherId) : null;
          // String comparison for platform (case-sensitive)
          return (
            normalizedControlPublisherId === normalizedPublisherId &&
            controlPlatform === platform
          );
        });
      }

      // If still not found, try alternative lookup using value property directly with normalization
      if (!control) {
        control = royalties.controls.find((ctrl) => {
          const controlValue = ctrl.value;
          const controlPlatformRaw = controlValue.platform;
          // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
          const controlPlatform =
            typeof controlPlatformRaw === 'object' &&
            controlPlatformRaw !== null &&
            'name' in controlPlatformRaw
              ? (controlPlatformRaw as { name: string }).name
              : String(controlPlatformRaw ?? '');
          const normalizedControlPublisherId =
            controlValue.publisherId != null
              ? Number(controlValue.publisherId)
              : null;
          const normalizedPublisherId =
            publisherId != null ? Number(publisherId) : null;
          return (
            normalizedControlPublisherId === normalizedPublisherId &&
            controlPlatform === platform
          );
        });
      }

      if (!control) {
        // ✅ Create new if missing - set publisher percentage based on author count
        // CRITICAL: Only create if no prefilled control exists (check by id and platform)
        // This prevents creating duplicate controls when prefilled controls exist but lookup failed
        const existingPrefilledControl = royalties.controls.find((ctrl) => {
          const ctrlValue = ctrl.value;
          const ctrlPublisherId =
            ctrl.controls.publisherId.value ?? ctrlValue.publisherId;
          const ctrlPlatformRaw =
            ctrl.controls.platform.value ?? ctrlValue.platform;
          // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
          const ctrlPlatform =
            typeof ctrlPlatformRaw === 'object' &&
            ctrlPlatformRaw !== null &&
            'name' in ctrlPlatformRaw
              ? (ctrlPlatformRaw as { name: string }).name
              : String(ctrlPlatformRaw ?? '');
          const ctrlId = ctrlValue.id;

          // Normalize for comparison
          const normalizedCtrlPublisherId =
            ctrlPublisherId != null ? Number(ctrlPublisherId) : null;
          const normalizedPublisherId =
            publisherId != null ? Number(publisherId) : null;

          // Check if this is a prefilled publisher control (has id and matches publisher/platform)
          const matches =
            ctrlId !== null &&
            ctrlId !== undefined &&
            normalizedCtrlPublisherId === normalizedPublisherId &&
            ctrlPlatform === platform;

          if (matches) {
            console.log(
              `[mapRoyaltiesArray] STEP 2 - Platform ${platform}: Found prefilled control in fallback check`,
              {
                id: ctrlId,
                ctrlPublisherId,
                normalizedCtrlPublisherId,
                publisherId,
                normalizedPublisherId,
                ctrlPlatformRaw,
                ctrlPlatform,
                platform,
                percentage: ctrl.controls.percentage.value,
              }
            );
          }

          return matches;
        });

        if (existingPrefilledControl) {
          // Use the existing prefilled control instead of creating a new one
          control = existingPrefilledControl;
          console.log(
            `[mapRoyaltiesArray] STEP 2 - Platform ${platform}: Using existing prefilled control`,
            {
              id: existingPrefilledControl.value.id,
              percentage: existingPrefilledControl.controls.percentage.value,
            }
          );
        } else {
          // No prefilled control exists, create new one
          control = this.createRoyaltyGroup({
            publisherId,
            titleId: this.titleId,
            name:
              publisher.name ||
              `${publisher.user?.firstName || ''} ${
                publisher.user?.lastName || ''
              }`.trim() ||
              'Unknown Publisher',
            platform,
            percentage: defaultPublisherPercentage, // 100% if no authors, 0% if authors exist
          });

          royalties.push(control);
          console.log(
            `[mapRoyaltiesArray] STEP 2 - Platform ${platform}: Created NEW publisher control`,
            {
              percentage: defaultPublisherPercentage,
              authorCount,
            }
          );
        }
      } else {
        // ✅ Keep existing values from API (if id exists) or if percentage is valid
        // Read from both control.value and form control value to ensure we get the correct value
        const existingValue = control.value;
        const hasId =
          existingValue.id !== null && existingValue.id !== undefined;

        // Read percentage from form control value (most reliable) or fallback to control.value
        const existingPercentage =
          control.controls.percentage.value ?? existingValue.percentage;

        const hasValidPercentage =
          existingPercentage !== null &&
          existingPercentage !== undefined &&
          !isNaN(Number(existingPercentage)) &&
          Number(existingPercentage) >= 0 &&
          Number(existingPercentage) <= 100;

        // If control has an id (from API), ALWAYS preserve the existing percentage
        // For new titles (no id), use defaultPublisherPercentage based on author count
        // When authors exist, publisher should get 0% (not preserve existing 100%)
        const percentageToSet = hasId
          ? existingPercentage // From API - always preserve
          : defaultPublisherPercentage; // New title - use default (0% if authors exist, 100% if no authors)

        console.log(
          `[mapRoyaltiesArray] STEP 2 - Platform ${platform}: Found existing publisher control`,
          {
            hasId,
            id: existingValue.id,
            existingPercentage,
            hasValidPercentage,
            percentageToSet,
            defaultPublisherPercentage,
          }
        );

        const publisherName =
          publisher.name ||
          `${publisher.user?.firstName || ''} ${
            publisher.user?.lastName || ''
          }`.trim() ||
          'Unknown Publisher';

        // Only update if values have changed
        // CRITICAL: For new titles (no ID), always check if percentage needs updating
        // This ensures publisher gets 0% when authors exist, not 100%
        const currentPercentage = control.controls.percentage.value;
        const needsUpdate =
          control.controls.publisherId.value !== publisherId ||
          control.controls.titleId.value !== this.titleId ||
          control.controls.name.value !== publisherName ||
          control.controls.platform.value !== platform ||
          (!hasId && currentPercentage !== percentageToSet); // Always update percentage for new titles if different

        if (needsUpdate) {
          control.patchValue(
            {
              publisherId,
              titleId: this.titleId,
              name: publisherName,
              platform,
              percentage: percentageToSet, // Preserve existing or use default
            },
            { emitEvent: false }
          ); // Prevent triggering other effects
        }
        // If no update needed, do nothing - preserve all existing values including percentage
      }
    }

    // 👥 STEP 3: Ensure author royalties per platform
    // Authors get remaining percentage after publisher's share
    // If publisher has 10%, authors get 90% (divided equally if multiple authors
    for (const author of authors) {
      const { id: authorId, name, user } = author;
      const authorName =
        name || `${user.firstName || ''} ${user.lastName || ''}`.trim();

      for (const platform of platforms) {
        // Calculate publisher's percentage for this platform
        // CRITICAL: Look up publisher control to get existing percentage (e.g., 10%)
        // Author should get remaining (e.g., 90% = 100% - 10%)
        // PRIORITIZE controls with id (from API) to ensure we get the correct prefilled percentage
        let publisherControl = royalties.controls.find((control) => {
          const controlValue = control.value;
          const hasId =
            controlValue.id !== null && controlValue.id !== undefined;
          if (!hasId) return false; // Skip controls without id in first pass

          const controlPublisherId =
            control.controls.publisherId.value ?? controlValue.publisherId;
          const controlPlatformRaw =
            control.controls.platform.value ?? controlValue.platform;
          // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
          const controlPlatform =
            typeof controlPlatformRaw === 'object' &&
            controlPlatformRaw !== null &&
            'name' in controlPlatformRaw
              ? (controlPlatformRaw as { name: string }).name
              : String(controlPlatformRaw ?? '');
          // Normalize for comparison
          const normalizedControlPublisherId =
            controlPublisherId != null ? Number(controlPublisherId) : null;
          const normalizedPublisherId =
            publisherId != null ? Number(publisherId) : null;
          return (
            normalizedControlPublisherId === normalizedPublisherId &&
            controlPlatform === platform
          );
        });

        // If not found, try all controls (including those without id)
        if (!publisherControl) {
          publisherControl = royalties.controls.find((control) => {
            const controlPublisherId =
              control.controls.publisherId.value ?? control.value.publisherId;
            const controlPlatformRaw =
              control.controls.platform.value ?? control.value.platform;
            // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
            const controlPlatform =
              typeof controlPlatformRaw === 'object' &&
              controlPlatformRaw !== null &&
              'name' in controlPlatformRaw
                ? (controlPlatformRaw as { name: string }).name
                : String(controlPlatformRaw ?? '');
            // Normalize for comparison
            const normalizedControlPublisherId =
              controlPublisherId != null ? Number(controlPublisherId) : null;
            const normalizedPublisherId =
              publisherId != null ? Number(publisherId) : null;
            return (
              normalizedControlPublisherId === normalizedPublisherId &&
              controlPlatform === platform
            );
          });
        }

        // If still not found, try alternative lookup using value property directly
        if (!publisherControl) {
          publisherControl = royalties.controls.find((control) => {
            const controlValue = control.value;
            const controlPlatformRaw = controlValue.platform;
            // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
            const controlPlatform =
              typeof controlPlatformRaw === 'object' &&
              controlPlatformRaw !== null &&
              'name' in controlPlatformRaw
                ? (controlPlatformRaw as { name: string }).name
                : String(controlPlatformRaw ?? '');
            const normalizedControlPublisherId =
              controlValue.publisherId != null
                ? Number(controlValue.publisherId)
                : null;
            const normalizedPublisherId =
              publisherId != null ? Number(publisherId) : null;
            return (
              normalizedControlPublisherId === normalizedPublisherId &&
              controlPlatform === platform
            );
          });
        }

        // Get publisher percentage - use form control's value (most reliable)
        // CRITICAL: Publisher controls are processed in STEP 2 above, so they should exist here
        // Read the percentage from the form control to get the actual current value
        // If publisher control exists from prefill (with id), it has the API value (e.g., 10%)
        // If publisher control was just created in STEP 2, it has defaultPublisherPercentage (0% when authors exist)
        let publisherPercentage = 0;
        if (publisherControl) {
          // Read from form control value - this is the most reliable way
          const percentageControl = publisherControl.controls.percentage;
          const percentageValue = percentageControl.value;
          const controlId = publisherControl.value.id;

          // If value is null/undefined, try getRawValue() as fallback
          const finalValue =
            percentageValue !== null && percentageValue !== undefined
              ? percentageValue
              : percentageControl.getRawValue();

          if (
            finalValue !== null &&
            finalValue !== undefined &&
            !isNaN(Number(finalValue))
          ) {
            publisherPercentage = Number(finalValue);
          }

          console.log(
            `[mapRoyaltiesArray] Platform ${platform}: Found publisher control`,
            {
              hasId: controlId != null,
              id: controlId,
              percentageValue,
              finalValue,
              publisherPercentage,
              controlValue: publisherControl.value,
            }
          );
        } else {
          console.warn(
            `[mapRoyaltiesArray] Platform ${platform}: NO publisher control found!`,
            {
              publisherId,
              totalControls: royalties.length,
              allPublisherControls: royalties.controls
                .filter((c) => {
                  const pid =
                    c.controls.publisherId.value ?? c.value.publisherId;
                  return pid === publisherId;
                })
                .map((c) => ({
                  platform: c.controls.platform.value ?? c.value.platform,
                  id: c.value.id,
                  percentage: c.controls.percentage.value,
                })),
            }
          );
        }

        // CRITICAL FIX: If publisher percentage is 0% but we found a control,
        // double-check if there's a prefilled control with id that has a different percentage.
        // This handles edge cases where the lookup found a newly created control (0%) instead of prefilled one (10%).
        if (publisherPercentage === 0 && publisherControl) {
          const controlValue = publisherControl.value;
          const hasId =
            controlValue.id !== null && controlValue.id !== undefined;

          // If the control we found doesn't have an id, try to find one that does (prefilled from API)
          if (!hasId) {
            const prefilledControl = royalties.controls.find((ctrl) => {
              const ctrlValue = ctrl.value;
              const ctrlHasId =
                ctrlValue.id !== null && ctrlValue.id !== undefined;
              if (!ctrlHasId) return false;

              const ctrlPublisherId =
                ctrl.controls.publisherId.value ?? ctrlValue.publisherId;
              const ctrlPlatformRaw =
                ctrl.controls.platform.value ?? ctrlValue.platform;
              // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
              const ctrlPlatform =
                typeof ctrlPlatformRaw === 'object' &&
                ctrlPlatformRaw !== null &&
                'name' in ctrlPlatformRaw
                  ? (ctrlPlatformRaw as { name: string }).name
                  : String(ctrlPlatformRaw ?? '');
              const normalizedCtrlPublisherId =
                ctrlPublisherId != null ? Number(ctrlPublisherId) : null;
              const normalizedPublisherId =
                publisherId != null ? Number(publisherId) : null;
              return (
                normalizedCtrlPublisherId === normalizedPublisherId &&
                ctrlPlatform === platform
              );
            });

            if (prefilledControl) {
              // Found a prefilled control - use its percentage instead
              publisherControl = prefilledControl;
              const percentageControl = prefilledControl.controls.percentage;
              const percentageValue =
                percentageControl.value ?? percentageControl.getRawValue();
              if (
                percentageValue !== null &&
                percentageValue !== undefined &&
                !isNaN(Number(percentageValue))
              ) {
                publisherPercentage = Number(percentageValue);
                console.log(
                  `[mapRoyaltiesArray] Platform ${platform}: Found prefilled control in safeguard`,
                  {
                    id: prefilledControl.value.id,
                    percentageValue,
                    publisherPercentage,
                  }
                );
              }
            }
          }
        }

        // If publisher control not found, it means it wasn't created in STEP 2
        // This shouldn't happen if prefill worked correctly, but if it does,
        // publisher gets 0% and author gets 100% (which is correct for new controls)

        // Calculate remaining percentage for authors (100% - publisher%)
        // If publisher has 10%, authors get 90%
        const remainingPercentage = Math.max(0, 100 - publisherPercentage);

        // Calculate author percentage: remaining divided equally among authors
        // If publisher has 10%, author gets 90% (or 45% each if 2 authors)
        const authorPercentageForPlatform =
          authorCount > 0
            ? authorCount === 1
              ? remainingPercentage
              : Math.round((remainingPercentage / authorCount) * 100) / 100
            : 0;

        console.log(
          `[mapRoyaltiesArray] Platform ${platform}: Author calculation`,
          {
            publisherPercentage,
            remainingPercentage,
            authorCount,
            authorPercentageForPlatform,
          }
        );

        // Look up author control - use form control values for reliable lookup
        // CRITICAL: Normalize platform for comparison (can be string or object)
        let control = royalties.controls.find((ctrl) => {
          const controlAuthorId = ctrl.controls.authorId.value;
          const controlPlatformRaw =
            ctrl.controls.platform.value ?? ctrl.value.platform;
          // Normalize platform: if it's an object, use the name property; if it's a string, use as-is
          const controlPlatform =
            typeof controlPlatformRaw === 'object' &&
            controlPlatformRaw !== null &&
            'name' in controlPlatformRaw
              ? (controlPlatformRaw as { name: string }).name
              : String(controlPlatformRaw ?? '');

          // Normalize authorId for comparison (handle string/number mismatch)
          const normalizedControlAuthorId =
            controlAuthorId != null ? Number(controlAuthorId) : null;
          const normalizedAuthorId = authorId != null ? Number(authorId) : null;

          return (
            normalizedControlAuthorId === normalizedAuthorId &&
            controlPlatform === platform
          );
        });

        if (!control) {
          // ✅ Create new if missing - set author percentage to remaining after publisher
          control = this.createRoyaltyGroup({
            authorId,
            titleId: this.titleId,
            name: authorName,
            platform,
            percentage: authorPercentageForPlatform, // Remaining after publisher's share
          });
          royalties.push(control);
          console.log(
            `[mapRoyaltiesArray] Platform ${platform}: Created NEW author control`,
            {
              authorId,
              authorPercentageForPlatform,
              publisherPercentage,
            }
          );
        } else {
          // ✅ CRITICAL: Preserve existing values from API (if id exists)
          // If control has an id, it came from the API - ALWAYS preserve its percentage
          // For new titles (no id), always use calculated authorPercentageForPlatform
          const existingValue = control.value;
          const hasId =
            existingValue.id !== null && existingValue.id !== undefined;
          const existingPercentage = existingValue.percentage;

          // CRITICAL: Only preserve percentage if control has ID from API
          // For new titles, always recalculate based on publisher's share
          const shouldPreservePercentage = hasId;

          if (shouldPreservePercentage) {
            // Preserve existing percentage - only update non-percentage fields if they're missing
            const needsUpdate =
              control.controls.authorId.value !== authorId ||
              control.controls.titleId.value !== this.titleId ||
              control.controls.name.value !== authorName ||
              control.controls.platform.value !== platform;

            if (needsUpdate) {
              // Only update non-percentage fields, explicitly preserve percentage
              control.patchValue(
                {
                  authorId,
                  titleId: this.titleId,
                  name: authorName,
                  platform,
                  percentage: existingPercentage, // CRITICAL: Preserve existing value from API
                },
                { emitEvent: false }
              ); // Prevent triggering other effects
            }
            // If no update needed, do nothing - preserve all existing values including percentage
          } else {
            // No id and percentage is default or invalid - recalculate based on publisher's share
            // This handles cases where controls were created with defaults or when author changes
            // Author gets remaining percentage after publisher
            console.log(
              `[mapRoyaltiesArray] Platform ${platform}: Updating author control percentage`,
              {
                authorId,
                existingPercentage,
                authorPercentageForPlatform,
                publisherPercentage,
              }
            );
            control.patchValue(
              {
                authorId,
                titleId: this.titleId,
                name: authorName,
                platform,
                percentage: authorPercentageForPlatform, // Remaining after publisher's share
              },
              { emitEvent: false }
            );
          }
        }
      }
    }
  }

  createRoyaltyGroup(
    data?: Partial<UpdateRoyalty> & {
      platform?: string | PlatForm | { id?: number; name?: string };
      titleId?: number;
    }
  ) {
    // Ensure platform is always a string (platform name)
    let platformValue: string | null = null;

    // Handle platformId (from UpdateRoyalty)
    if (data?.platformId) {
      const platformObj = this.platformService
        .platforms()
        .find((p) => p.id === data.platformId);
      platformValue = platformObj?.name || null;
    }
    // Handle platform (string, PlatForm enum, or ViewPlatformDto object) - for backward compatibility and when creating new groups
    else if (data?.platform) {
      if (typeof data.platform === 'string') {
        platformValue = data.platform;
      } else if (typeof data.platform === 'object' && data.platform !== null) {
        // Extract name from platform object (ViewPlatformDto has 'name' property)
        const platformObj = data.platform as any;
        platformValue = platformObj.name || null;
        // If we have platform.id but no name, try to look it up
        if (!platformValue && platformObj.id) {
          const foundPlatform = this.platformService
            .platforms()
            .find((p) => p.id === platformObj.id);
          platformValue = foundPlatform?.name || null;
        }
      }
    }

    // Use nullish coalescing (??) instead of || to preserve 0 values
    const percentageValue = data?.percentage ?? null;

    const royaltyGroup = new FormGroup<RoyaltyFormGroup>({
      id: new FormControl<number | null>(data?.id ?? null),
      name: new FormControl<string | null>(data?.name ?? null),
      authorId: new FormControl<number | null>(data?.authorId ?? null),
      publisherId: new FormControl<number | null>(data?.publisherId ?? null),
      percentage: new FormControl(percentageValue, [Validators.required]),
      platform: new FormControl<string | null>(platformValue),
      titleId: new FormControl<number>(data?.titleId ?? this.titleId),
    });

    return royaltyGroup;
  }

  async calculatePrintingCost() {
    const printGroup = this.tempForm.controls.printing;

    if (!printGroup) {
      return;
    }

    const {
      bookBindingsId: { value: bookBindingsId },
      totalPages: { value: totalPages },
      colorPages: { value: colorPages },
      isColorPagesRandom: { value: isColorPagesRandom },
      bwPages: { value: bwPages },
      insideCover: { value: insideCover },
      laminationTypeId: { value: laminationTypeId },
      paperQuailtyId: { value: paperQuailtyId },
      sizeCategoryId: { value: sizeCategoryId },
      customPrintCost: { value: customPrintCost },
    } = printGroup.controls;

    // Validate all required fields are numbers
    // Note: colorPages can be 0, so we check for null/undefined separately
    if (
      colorPages === null ||
      colorPages === undefined ||
      totalPages === null ||
      totalPages === undefined ||
      !paperQuailtyId ||
      !sizeCategoryId ||
      !laminationTypeId ||
      !bookBindingsId ||
      isNaN(Number(colorPages)) ||
      isNaN(Number(totalPages)) ||
      Number(colorPages) < 0 ||
      Number(totalPages) <= 0 ||
      isNaN(Number(paperQuailtyId)) ||
      isNaN(Number(sizeCategoryId)) ||
      isNaN(Number(laminationTypeId)) ||
      isNaN(Number(bookBindingsId))
    ) {
      return;
    }

    try {
      const payload: TitlePrintingCostPayload = {
        colorPages: Number(colorPages),
        bwPages: Number(bwPages) || 0,
        paperQuailtyId: Number(paperQuailtyId),
        sizeCategoryId: Number(sizeCategoryId),
        totalPages: Number(totalPages),
        laminationTypeId: Number(laminationTypeId),
        isColorPagesRandom: !!isColorPagesRandom,
        bindingTypeId: Number(bookBindingsId),
        insideCover: !!insideCover,
      };

      // Include customPrintCost if it's a valid number and greater than 0
      // null, undefined, or 0 means no custom print cost
      if (
        customPrintCost !== null &&
        customPrintCost !== undefined &&
        customPrintCost !== 0 &&
        !isNaN(Number(customPrintCost)) &&
        Number(customPrintCost) > 0
      ) {
        payload.customPrintCost = Number(customPrintCost);
      }

      const mspController = this.tempForm.controls.printing.controls.msp;
      const printingPrice =
        this.tempForm.controls.printing.controls.printingPrice;
      const customPrintCostControl =
        this.tempForm.controls.printing.controls.customPrintCost;
      const response = await this.printingService.getPrintingPrice(payload);

      if (response?.printPerItem && typeof response.printPerItem === 'number') {
        // Use emitEvent: false to prevent triggering valueChanges and causing infinite loop
        mspController?.patchValue(response.msp, { emitEvent: false });
        // Always save actual print price (not custom)
        printingPrice?.patchValue(response.printPerItem, { emitEvent: false });
        // Save custom print cost separately if provided
        if (
          response.customPrintCost !== null &&
          response.customPrintCost !== undefined
        ) {
          customPrintCostControl?.patchValue(response.customPrintCost, {
            emitEvent: false,
          });
        }
        // Update author print price validators after printing cost changes
        this.updateAuthorPrintPriceValidators();
        // Note: Validation for customPrintCost is handled in temp-title-printing component on blur
      }
    } catch (error) {
      console.error('Error calculating printing cost:', error);
      // Don't show error to user as this is called frequently during form changes
    }
  }

  /**
   * Update validators for all author print price controls
   * Should be called when printing cost changes
   */
  private updateAuthorPrintPriceValidators(): void {
    const authorIds = this.tempForm.controls.titleDetails.controls.authorIds;
    authorIds.controls.forEach((authorControl) => {
      const authorPrintPriceControl = authorControl.controls.authorPrintPrice;
      if (authorPrintPriceControl) {
        authorPrintPriceControl.setValidators([
          this.authorPrintPriceValidator(),
        ]);
        authorPrintPriceControl.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  prefillFormData(data: Title): void {
    // Check if ebook ISBN is auto-generated (starts with BCBL prefix, case-insensitive)
    // Auto-generated codes are in format: BCBL-TEST-00027 (not standard ISBN-13)
    const isEbookISBNAutoGenerated = data.isbnEbook
      ?.toUpperCase()
      ?.startsWith('BCBL');

    // Format ISBNs - formatIsbn13 will handle BCBL codes by returning them as-is
    const formatIsbnPrint = formatIsbn13(data.isbnPrint);
    const formatIsbnEbook = formatIsbn13(data.isbnEbook);

    this.tempForm.patchValue({
      printingFormat: data.printingOnly ? 'printOnly' : 'publish&print',
      hasFiles: true,
      publishingType: data.publishingType,
      titleDetails: {
        name: data.name,
        subTitle: data.subTitle,
        longDescription: data.longDescription,
        shortDescription: data.shortDescription,
        edition: data.edition,
        language: data.language,
        subject: data.subject,
        status: data.status || 'Active',
        category: data.category.id as any,
        subCategory: data.subCategory.id as any,
        tradeCategory: data.tradeCategory.id as any,
        genre: (data.genre.id as any) || null,
        keywords: data.keywords,
        isUniqueIdentifier: data.isUniqueIdentifier,
        keywordOption: 'auto',
        manualKeywords: '',
        autoKeywords: data.keywords,
        publisher: {
          id: data.publisher?.id || null,
          name: data.publisher?.name || '',
          keepSame: true,
          displayName: data.publisher?.name || '',
        },
        publisherDisplay: data.publisherDisplay || data.publisher?.name || '',
        isbnPrint: formatIsbnPrint || null,
        isbnEbook: formatIsbnEbook || null,
        isEbookIsbnAutoGenerated: isEbookISBNAutoGenerated,
        launch_date: data.launch_date
          ? new Date(data.launch_date).toISOString().split('T')[0]
          : null,
      },

      printing: {
        id: data.printing?.[0]?.id,
        bookBindingsId:
          data.printing?.[0]?.bindingType.id ||
          this.tempForm.value.printing?.bookBindingsId,
        totalPages: data.printing?.[0]?.totalPages || 0,
        colorPages: data.printing?.[0]?.colorPages || 0,
        isColorPagesRandom: data.printing?.[0]?.isColorPagesRandom,
        bwPages: data.printing?.[0]?.bwPages,
        insideCover: data.printing?.[0]?.insideCover || false,
        laminationTypeId:
          data.printing?.[0]?.laminationType.id ||
          this.tempForm.value.printing?.laminationTypeId,
        paperType:
          data.printing?.[0]?.paperType ||
          this.tempForm.value.printing?.paperType,
        paperQuailtyId:
          data.printing?.[0]?.paperQuailty.id ||
          this.tempForm.value.printing?.paperQuailtyId,
        sizeCategoryId:
          data.printing?.[0]?.size.id ||
          this.tempForm.value.printing?.sizeCategoryId,
        msp: data.printing?.[0]?.printCost,
        customPrintCost:
          data.printing?.[0]?.customPrintCost !== null &&
          data.printing?.[0]?.customPrintCost !== undefined
            ? Number(data.printing[0].customPrintCost)
            : null,
      },
    });
    if (isEbookISBNAutoGenerated) {
      this.tempForm.controls.titleDetails.controls.isbnEbook.disable();
    }
    this.tempForm.controls.titleDetails.controls.authorIds.clear();

    // Prefill royalties FIRST before setting signals to prevent mapRoyaltiesArray from overriding
    // with default values
    this.isPrefillingRoyalties = true; // Set flag to prevent mapRoyaltiesArray from running
    try {
      // Clear existing royalty controls to start fresh with API data
      // This ensures we don't have controls with default 100% values that might interfere
      while (this.tempForm.controls.royalties.length > 0) {
        this.tempForm.controls.royalties.removeAt(0);
      }

      data.royalties?.forEach((d) => {
        const { authorId: aId, publisherId: pId } = d;

        // Extract platform name from platform object (ViewPlatformDto has 'name' property)
        const platformName =
          typeof d.platform === 'string'
            ? d.platform
            : (d.platform as any)?.name || null;

        if (!platformName) {
          console.warn('Royalty missing platform name:', d);
          return;
        }

        const controlExist = this.tempForm.controls.royalties.controls.find(
          ({ controls: { authorId, publisherId, platform } }) => {
            const controlPlatformName = platform.value as string;
            return (
              (aId &&
                aId === authorId.value &&
                controlPlatformName === platformName) ||
              (pId &&
                pId === publisherId.value &&
                controlPlatformName === platformName)
            );
          }
        );

        if (controlExist) {
          controlExist.patchValue({
            id: d.id ?? null,
            percentage: d.percentage,
          });
        } else {
          this.tempForm.controls.royalties.push(
            this.createRoyaltyGroup({
              id: d.id ?? null,
              platform: platformName,
              percentage: d.percentage,
              publisherId: pId,
              authorId: aId,
              titleId: this.titleId,
            })
          );
        }
      });
    } finally {
      this.isPrefillingRoyalties = false; // Clear flag after prefilling is complete
    }

    // Set signals AFTER royalties are prefilled to prevent mapRoyaltiesArray from overriding
    // existing values with defaults
    this.authorsSignal.set(data.authors?.map(({ author }) => author) || []);
    this.publisherSignal.set(data.publisher);

    data.authors?.forEach(({ author, display_name, authorPrintPrice }) => {
      this.tempForm.controls.titleDetails.controls.authorIds.push(
        new FormGroup<AuthorFormGroup>({
          id: new FormControl<number | null>(author.id),
          name: new FormControl<string>(author.name),
          keepSame: new FormControl<boolean>(author.name === display_name),
          displayName: new FormControl<string>(display_name),
          authorPrintPrice: new FormControl<number | null>(
            authorPrintPrice ?? null
          ),
        })
      );
    });

    this.updatePricingArray(data.pricing);

    const interior = data.media?.find(
      ({ type }) => type === TitleMediaType.INTERIOR
    );

    if (interior) {
      this.tempForm.controls.printing.controls.totalPages.patchValue(
        interior.noOfPages || 0
      );
      // Auto-calculate black and white pages and MSP after form state is updated
      queueMicrotask(() => {
        this.calculateBlackAndWhitePages();
        // Recalculate printing cost (MSP) when totalPages changes
        // This will calculate if all required fields are available
        this.calculatePrintingCost();
        this.cdr.markForCheck();
      });
    }

    if (
      data.distribution?.find(
        ({ type }) => type === DistributionType.Hardbound_National
      )
    ) {
      this.tempForm.controls.printing.controls.bookBindingsId.disable();
    }

    if (
      data.printing?.[0]?.bindingType?.name?.toLowerCase().includes('hardbound')
    ) {
      // Update signal to reflect hardbound is allowed
      this.isHardBoundAllowedSignal.set(true);
      this.tempForm.controls.distribution.insert(
        0,
        new FormGroup<TitleDistributionGroup>({
          id: new FormControl<number | null>(null),
          isSelected: new FormControl(false, { nonNullable: true }),
          type: new FormControl(DistributionType.Hardbound_National, {
            nonNullable: true,
          }),
          availablePoints: new FormControl(0, { nonNullable: true }),
          name: new FormControl(DistributionType.Hardbound_National, {
            nonNullable: true,
          }),
        })
      );
      this.ensureMahFirstPosition();
    } else {
      // Update signal to reflect hardbound is not allowed
      this.isHardBoundAllowedSignal.set(false);
    }

    // Check if National or Hardbound_National exists in saved distributions
    const hasNationalDistribution = data.distribution?.some(
      ({ type }) => type === DistributionType.National
    );
    const hasHardboundDistribution = data.distribution?.some(
      ({ type }) => type === DistributionType.Hardbound_National
    );
    const hasMahDistribution = data.distribution?.some(
      ({ type }) => type === DistributionType.MAH
    );

    // Remove opposite control if one is found
    if (hasNationalDistribution) {
      // If National is saved, remove Hardbound_National control if it exists
      const hardboundControl =
        this.tempForm.controls.distribution.controls.find(
          ({ controls }) =>
            controls.type.value === DistributionType.Hardbound_National
        );
      if (hardboundControl) {
        const hardboundIndex =
          this.tempForm.controls.distribution.controls.indexOf(
            hardboundControl
          );
        if (hardboundIndex >= 0) {
          this.tempForm.controls.distribution.removeAt(hardboundIndex);
        }
      }
    } else if (hasHardboundDistribution) {
      // If Hardbound_National is saved, remove National control if it exists
      const nationalControl = this.tempForm.controls.distribution.controls.find(
        ({ controls }) => controls.type.value === DistributionType.National
      );
      if (nationalControl) {
        const nationalIndex =
          this.tempForm.controls.distribution.controls.indexOf(nationalControl);
        if (nationalIndex >= 0) {
          this.tempForm.controls.distribution.removeAt(nationalIndex);
        }
      }
    }

    // Ensure MAH exists and is selected (even if not returned from backend yet)
    const mahControl = this.tempForm.controls.distribution.controls.find(
      ({ controls }) => controls.type.value === DistributionType.MAH
    );
    if (mahControl) {
      mahControl.controls.isSelected.patchValue(true);
    } else {
      this.tempForm.controls.distribution.insert(
        0,
        new FormGroup<TitleDistributionGroup>({
          id: new FormControl<number | null>(null),
          isSelected: new FormControl(true, { nonNullable: true }),
          type: new FormControl(DistributionType.MAH, { nonNullable: true }),
          availablePoints: new FormControl(Number.MAX_SAFE_INTEGER, {
            nonNullable: true,
          }),
          name: new FormControl(DistributionType.MAH, { nonNullable: true }),
        })
      );
    }
    this.ensureMahFirstPosition();

    data.distribution?.forEach(({ id, type }) => {
      const disTypeControl = this.tempForm.controls.distribution.controls.find(
        ({ controls }) => controls.type.value === type
      );

      if (disTypeControl) {
        disTypeControl.controls.isSelected.patchValue(true);
        disTypeControl.controls.id.patchValue(id);
      } else {
        this.tempForm.controls.distribution.insert(
          0,
          new FormGroup<TitleDistributionGroup>({
            id: new FormControl<number | null>(id),
            isSelected: new FormControl(true, { nonNullable: true }),
            type: new FormControl(type, { nonNullable: true }),
            availablePoints: new FormControl(0, { nonNullable: true }),
            name: new FormControl(type, { nonNullable: true }),
          })
        );
        this.fetchAndUpdatePublishingPoints();
      }
    });

    // Update distribution validation after pre-filling
    // This ensures validation passes if distributions already exist
    this.tempForm.controls.distribution.updateValueAndValidity();
  }

  minWordsValidator(minWords: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value || '').trim();
      const wordCount = value.split(/\s+/).filter(Boolean).length;

      return value.length && wordCount < minWords
        ? { minWords: { required: minWords, actual: wordCount } }
        : null;
    };
  }

  maxWordsValidator(maxWords: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value || '').trim();
      const wordCount = value.split(/\s+/).filter(Boolean).length;

      return value.length && wordCount && wordCount > maxWords
        ? {
            maxWords: {
              required: maxWords,
              actual: wordCount,
              maxWords: maxWords,
            },
          }
        : null;
    };
  }

  /**
   * Validates ISBN-13 format (allows hyphens)
   * ISBN-13 must be 13 digits, optionally with hyphens
   * Must start with 978 or 979
   */
  isbn13Validator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as string | null;

      if (!value || value.trim() === '') {
        return null; // Allow empty values (optional field)
      }

      // Remove hyphens and spaces for validation
      const digitsOnly = value.replace(/[-\s]/g, '');

      // Must be exactly 13 digits
      if (digitsOnly.length !== 13) {
        return { invalidIsbn: 'ISBN must be exactly 13 digits' };
      }

      // Must start with 978 or 979
      if (!/^(978|979)/.test(digitsOnly)) {
        return { invalidIsbn: 'ISBN must start with 978 or 979' };
      }

      // Must contain only digits (after removing hyphens)
      if (!/^\d{13}$/.test(digitsOnly)) {
        return { invalidIsbn: 'ISBN must contain only digits' };
      }

      return null;
    };
  }

  updatePricingArray(pricing?: TitlePricing[]) {
    // Ensure pricing array has all platforms before updating
    // This prevents duplicate controllers
    this.ensurePricingArrayHasAllPlatforms();

    if (!pricing || pricing.length === 0) {
      return;
    }

    pricing.forEach(({ platform, id, mrp, salesPrice }) => {
      // Find existing control by platform name
      // ensurePricingArrayHasAllPlatforms should have already created all necessary controls
      const pricingControl = this.tempForm.controls['pricing'].controls?.find(
        ({ controls }) => controls.platform.value === platform
      );

      if (pricingControl) {
        // Update existing control values
        // Set isSameAsMrp to false if values differ, true if they're the same
        const isSameAsMrp = mrp === salesPrice;

        pricingControl.patchValue(
          {
            id,
            platform,
            mrp,
            salesPrice,
            isSameAsMrp,
          },
          { emitEvent: false }
        );
      } else {
        // This should not happen if ensurePricingArrayHasAllPlatforms worked correctly
        // Log warning for debugging
        console.warn(
          `Platform "${platform}" control not found after ensurePricingArrayHasAllPlatforms. Platform may not exist in available platforms.`
        );
      }
    });
  }

  /**
   * Get MSP for a specific platform
   * For platforms with isEbookPlatform = true, MSP is fixed at EBOOK_MSP keyval
   * For platforms with isEbookPlatform = false, use the calculated MSP from printing cost
   * @param platformId - The platform ID
   * @returns The MSP value for the platform
   */
  getMspForPlatform(platformId: number | null | undefined): number {
    if (!platformId || platformId <= 0) {
      // Fallback to calculated MSP if platform is not available
      return Number(this.tempForm.controls.printing.controls.msp?.value) || 0;
    }

    // Fixed MSP for ebook platforms (determined by isEbookPlatform field)
    const platformData = this.platformService
      .platforms()
      .find((p) => p.id === platformId);
    if (platformData && platformData.isEbookPlatform) {
      return Number(this.staticValuesService.staticValues()?.EBOOK_MSP);
    }

    // Use calculated MSP for print platforms
    return Number(this.tempForm.controls.printing.controls.msp?.value) || 0;
  }

  mrpValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null; // parent not ready yet
      }

      // Get platform name from parent form group
      const platformName = control.parent.get('platform')?.value as
        | string
        | null
        | undefined;

      // Get platform object to access platformId
      const platform = platformName
        ? this.platformService.getPlatformByName(platformName)
        : null;

      const platformMsp = this.getMspForPlatform(platform?.id);
      const mrp = Number(control.value);

      return platformMsp !== null && platformMsp > 0 && mrp < platformMsp
        ? {
            invalid: `MRP cannot be lower than MSP (${platformMsp.toFixed(2)})`,
          }
        : null;
    };
  }

  salesPriceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null; // parent not ready yet
      }

      // Get platform name from parent form group
      const platformName = control.parent.get('platform')?.value as
        | string
        | null
        | undefined;

      // Get platform object to access platformId
      const platform = platformName
        ? this.platformService.getPlatformByName(platformName)
        : null;

      const platformMsp = this.getMspForPlatform(platform?.id);
      const mrp = control.parent.get('mrp')?.value;
      const salesPrice = control.value;

      if (platformMsp > 0 && salesPrice < platformMsp) {
        return {
          invalid: `Sales price cannot be lower than MSP (${platformMsp.toFixed(
            2
          )})`,
        };
      }
      if (salesPrice > mrp) {
        return {
          invalid: 'Sales price cannot be higher than MRP',
        };
      }
      return null;
    };
  }

  authorPrintPriceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      // Allow empty values - this is an optional field
      if (
        !control.value ||
        control.value === null ||
        control.value === '' ||
        control.value === undefined
      ) {
        return null;
      }

      const authorPrintPrice = Number(control.value);
      // If not a valid number or negative, let other validators handle it
      if (isNaN(authorPrintPrice) || authorPrintPrice < 0) {
        return null;
      }

      // Only validate if printing cost is available
      // If printing cost is not available yet, don't validate (allow the value)
      const customPrintCost =
        this.tempForm.controls.printing.controls.customPrintCost.value;
      const printingPrice =
        this.tempForm.controls.printing.controls.printingPrice.value;

      // Use custom print cost if available, otherwise use actual printing price
      const minPrintingCost =
        customPrintCost !== null && customPrintCost !== undefined
          ? Number(customPrintCost)
          : printingPrice !== null && printingPrice !== undefined
          ? Number(printingPrice)
          : null;

      // Only validate if we have a valid printing cost
      // If printing cost is not available yet, don't fail validation
      if (
        minPrintingCost !== null &&
        !isNaN(minPrintingCost) &&
        minPrintingCost > 0
      ) {
        if (authorPrintPrice < minPrintingCost) {
          return {
            invalid: `Author print price cannot be lower than printing cost (${minPrintingCost.toFixed(
              2
            )})`,
          };
        }
      }

      // If printing cost is not available, don't validate (allow the value)
      // This prevents validation errors when printing cost hasn't been calculated yet
      return null;
    };
  }

  /**
   * Log form validation errors for debugging
   */
  private logFormValidationErrors(
    formGroup: FormGroup | FormArray | AbstractControl
  ): void {
    if (formGroup instanceof FormGroup || formGroup instanceof FormArray) {
      Object.keys(formGroup.controls).forEach((key) => {
        const control = formGroup.get(key);
        if (control) {
          if (control instanceof FormGroup || control instanceof FormArray) {
            this.logFormValidationErrors(control);
          } else if (control.invalid && control.errors) {
            console.error(`Validation error in ${key}:`, control.errors);
          }
        }
      });
    } else if (formGroup.invalid && formGroup.errors) {
      console.error('Validation error:', formGroup.errors);
    }
  }

  distributionValidator(): ValidatorFn {
    return (control) => {
      // Form may not be fully initialized during first run
      const publishingType = this.tempForm?.controls?.publishingType?.value;

      // Check if distributions already exist for this title
      // If they exist, validation passes (user doesn't need to select again)
      const existingDistributions = this.titleDetails()?.distribution ?? [];
      if (existingDistributions.length > 0) {
        return null; // Validation passes if distributions already exist
      }

      // Only validate if no distributions exist yet
      const distributions = (
        control as FormArray<FormGroup<TitleDistributionGroup>>
      ).value;

      // Ebook-only: MAH is mandatory and the only allowed option
      if (publishingType === PublishingType.ONLY_EBOOK) {
        const hasMah = distributions.some(
          ({ type, isSelected }) => type === DistributionType.MAH && isSelected
        );

        if (!hasMah) {
          return {
            invalid: 'MAH distribution is required for ebook-only titles.',
          };
        }

        return null;
      }

      const national = distributions.find(
        ({ type, isSelected }) =>
          type === DistributionType.National && isSelected
      );
      const hardboundNational = distributions.find(
        ({ type, isSelected }) =>
          type === DistributionType.Hardbound_National && isSelected
      );

      // MAH must always be selected (all publishing types)
      const hasMahSelected = distributions.some(
        ({ type, isSelected }) => type === DistributionType.MAH && isSelected
      );
      if (!hasMahSelected) {
        return {
          invalid: 'MAH distribution is required.',
        };
      }

      const isHardBoundAllowed =
        this.bindingType
          ?.find(
            ({ id }) =>
              id ===
              this.tempForm.controls?.printing?.controls?.bookBindingsId?.value
          )
          ?.name?.toLowerCase()
          ?.includes('hardbound') ?? false;

      if (!national && !hardboundNational) {
        return {
          invalid: isHardBoundAllowed
            ? 'Either choose national or hardbound national atleast.'
            : 'National distribution is required.',
        };
      }

      return null;
    };
  }

  /**
   * Calculate and set black and white pages based on total pages and color pages
   * Formula: bwPages = totalPages - colorPages
   */
  private calculateBlackAndWhitePages(): void {
    const totalPagesControl =
      this.tempForm.controls.printing.controls.totalPages;
    const colorPagesControl =
      this.tempForm.controls.printing.controls.colorPages;
    const bwPagesControl = this.tempForm.controls.printing.controls.bwPages;

    const totalPages = Number(totalPagesControl.value || 0);
    const colorPages = Number(colorPagesControl.value || 0);

    if (totalPages > 0) {
      const bwPages = Math.max(0, totalPages - colorPages);
      bwPagesControl.patchValue(bwPages, { emitEvent: false });
    }
  }

  createDistributionOptions(): FormArray<FormGroup<TitleDistributionGroup>> {
    const publishingType = this.tempForm?.controls?.publishingType?.value;
    const allTypes = Object.values(DistributionType) as DistributionType[];

    const baseTypes = allTypes.filter(
      (type) => type !== DistributionType.Hardbound_National
    );

    // ALWAYS include MAH; for ONLY_EBOOK show only MAH
    const filteredTypes: DistributionType[] =
      publishingType === PublishingType.ONLY_EBOOK
        ? [DistributionType.MAH]
        : Array.from(
            new Set<DistributionType>([DistributionType.MAH, ...baseTypes])
          );

    // Ensure MAH is always first in the list
    const orderedTypes = filteredTypes.sort((a, b) =>
      a === DistributionType.MAH ? -1 : b === DistributionType.MAH ? 1 : 0
    );

    return new FormArray<FormGroup<TitleDistributionGroup>>(
      orderedTypes.map(
        (type) =>
          new FormGroup<TitleDistributionGroup>({
            id: new FormControl<number | null>(null),
            isSelected: new FormControl(type === DistributionType.MAH, {
              nonNullable: true,
            }),
            name: new FormControl(type, { nonNullable: true }),
            type: new FormControl(type as DistributionType, {
              nonNullable: true,
            }),
            availablePoints: new FormControl(
              type === DistributionType.MAH ? Number.MAX_SAFE_INTEGER : 0,
              { nonNullable: true }
            ),
          })
      ),
      { validators: [this.distributionValidator()] }
    );
  }

  private ensureMahFirstPosition(): void {
    const controls = this.tempForm?.controls?.distribution;
    if (!controls) return;

    const mahIndex = controls.controls.findIndex(
      ({ controls: { type } }) => type.value === DistributionType.MAH
    );

    if (mahIndex > 0) {
      const mahControl = controls.at(mahIndex);
      controls.removeAt(mahIndex);
      controls.insert(0, mahControl);
    }
  }

  createPricingArrayTemp(): FormArray<PricingGroup> {
    // Get platform names from platform service instead of static values
    const platforms = this.platformService.getPlatformNames();

    // If no platforms available yet, return empty array
    // It will be initialized later when platforms load
    if (!platforms.length) {
      return new FormArray<PricingGroup>([]);
    }

    return new FormArray(
      platforms.map(
        (platform) =>
          new FormGroup({
            id: new FormControl<number | null | undefined>(null),
            platform: new FormControl<string>(platform, Validators.required),
            salesPrice: new FormControl<number | null | undefined>(null, [
              Validators.required,
              this.salesPriceValidator() as ValidatorFn,
            ]),
            mrp: new FormControl<number | null | undefined>(null, [
              Validators.required,
              this.mrpValidator() as ValidatorFn,
            ]),
            isSameAsMrp: new FormControl<boolean>(true), // Default to true
          }) as PricingGroup
      )
    );
  }

  /**
   * Ensure pricing array has all platforms
   * Call this when platforms become available
   * Prevents duplicate platform controls
   */
  private ensurePricingArrayHasAllPlatforms(): void {
    const platforms = this.platformService.platforms();

    if (!platforms.length) {
      return; // Platforms not loaded yet
    }

    const pricingArray = this.tempForm.controls.pricing;

    // Create a Set of existing platform names for faster lookup
    const existingPlatforms = new Set(
      pricingArray.controls
        .map((control) => control.controls.platform.value)
        .filter(
          (platform): platform is string =>
            platform !== null && platform !== undefined
        )
    );

    // Add missing platforms only
    const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';

    platforms.forEach((platform) => {
      // Check if platform already exists - don't create duplicate
      if (!existingPlatforms.has(platform.name)) {
        // For publishers, don't set validators for superadmin-only platforms without pricing
        const isSuperAdminOnly = platform.isSuperAdminPricingOnly ?? false;
        const shouldSetValidators = !isPublisher || !isSuperAdminOnly;

        const newControl = new FormGroup({
          id: new FormControl<number | null | undefined>(null),
          platform: new FormControl<string>(platform.name, Validators.required),
          salesPrice: new FormControl<number | null | undefined>(
            null,
            shouldSetValidators
              ? [Validators.required, this.salesPriceValidator() as ValidatorFn]
              : []
          ),
          mrp: new FormControl<number | null | undefined>(
            null,
            shouldSetValidators
              ? [Validators.required, this.mrpValidator() as ValidatorFn]
              : []
          ),
          isSameAsMrp: new FormControl<boolean>(true), // Default to true
        }) as PricingGroup;

        pricingArray.push(newControl);
        // Add to set to prevent duplicates if method is called multiple times
        existingPlatforms.add(platform.name);
      }
    });

    // Update validators based on current publishing type
    // This will handle cases where pricing already exists for superadmin-only platforms
    this.updatePricingValidatorsForPublishingType(
      this.tempForm.controls.publishingType.value
    );
  }

  /**
   * Update pricing validators based on publishing type
   * For ebook-only titles, remove required validators from non-ebook platforms
   */
  private updatePricingValidatorsForPublishingType(
    publishingType: PublishingType | null | undefined
  ): void {
    const pricingArray = this.tempForm.controls.pricing;
    if (!pricingArray || pricingArray.length === 0) {
      return;
    }

    const isOnlyEbook = publishingType === PublishingType.ONLY_EBOOK;
    const isOnlyPrint = publishingType === PublishingType.ONLY_PRINT;
    const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';

    pricingArray.controls.forEach((control) => {
      const platformName = control.controls.platform.value as string | null;
      const platform = platformName
        ? this.platformService.getPlatformByName(platformName)
        : null;
      const isEbookPlatform = platform?.isEbookPlatform ?? false;
      const isPrintPlatform = !isEbookPlatform;
      const isSuperAdminOnly = platform?.isSuperAdminPricingOnly ?? false;

      // Helper function to check if validators should be set for this platform
      const shouldSetValidators = () => {
        // For publishers with superadmin-only platforms without pricing, don't set validators
        if (isPublisher && isSuperAdminOnly) {
          const hasPricing =
            control.controls.id.value != null ||
            control.controls.salesPrice.value != null ||
            control.controls.mrp.value != null;
          return hasPricing; // Only set validators if pricing already exists
        }
        return true; // For all other cases, set validators
      };

      if (isOnlyEbook) {
        // For ebook-only titles, remove validators from non-ebook platforms
        if (!isEbookPlatform) {
          control.controls.salesPrice.clearValidators();
          control.controls.mrp.clearValidators();
          control.controls.salesPrice.updateValueAndValidity({
            emitEvent: false,
          });
          control.controls.mrp.updateValueAndValidity({ emitEvent: false });
        } else {
          // Ensure ebook platforms have validators (if allowed)
          if (shouldSetValidators()) {
            control.controls.salesPrice.setValidators([
              Validators.required,
              this.salesPriceValidator() as ValidatorFn,
            ]);
            control.controls.mrp.setValidators([
              Validators.required,
              this.mrpValidator() as ValidatorFn,
            ]);
          } else {
            control.controls.salesPrice.clearValidators();
            control.controls.mrp.clearValidators();
          }
          control.controls.salesPrice.updateValueAndValidity({
            emitEvent: false,
          });
          control.controls.mrp.updateValueAndValidity({ emitEvent: false });
        }
      } else if (isOnlyPrint) {
        // For print-only titles, remove validators from non-print platforms
        if (!isPrintPlatform) {
          control.controls.salesPrice.clearValidators();
          control.controls.mrp.clearValidators();
          control.controls.salesPrice.updateValueAndValidity({
            emitEvent: false,
          });
          control.controls.mrp.updateValueAndValidity({ emitEvent: false });
        } else {
          // Ensure print platforms have validators (if allowed)
          if (shouldSetValidators()) {
            control.controls.salesPrice.setValidators([
              Validators.required,
              this.salesPriceValidator() as ValidatorFn,
            ]);
            control.controls.mrp.setValidators([
              Validators.required,
              this.mrpValidator() as ValidatorFn,
            ]);
          } else {
            control.controls.salesPrice.clearValidators();
            control.controls.mrp.clearValidators();
          }
          control.controls.salesPrice.updateValueAndValidity({
            emitEvent: false,
          });
          control.controls.mrp.updateValueAndValidity({ emitEvent: false });
        }
      } else {
        // For PRINT_EBOOK, ensure all platforms have validators (if allowed)
        if (shouldSetValidators()) {
          control.controls.salesPrice.setValidators([
            Validators.required,
            this.salesPriceValidator() as ValidatorFn,
          ]);
          control.controls.mrp.setValidators([
            Validators.required,
            this.mrpValidator() as ValidatorFn,
          ]);
        } else {
          control.controls.salesPrice.clearValidators();
          control.controls.mrp.clearValidators();
        }
        control.controls.salesPrice.updateValueAndValidity({
          emitEvent: false,
        });
        control.controls.mrp.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  createTitleDetailsGroup(): FormGroup<TitleDetailsFormGroup> {
    return new FormGroup<TitleDetailsFormGroup>({
      name: new FormControl<string>('', Validators.required),
      subTitle: new FormControl<string>(''),
      longDescription: new FormControl<string>('', [
        Validators.required,
        this.minWordsValidator(40),
      ]),
      shortDescription: new FormControl<string>('', [
        this.maxWordsValidator(40), // Max 40 words
      ]),
      edition: new FormControl<number>(1), // Default to 1
      language: new FormControl<string>(''),
      subject: new FormControl<string>(''), // Made optional - no validators
      status: new FormControl<TitleStatus>(TitleStatus.DRAFT),
      category: new FormControl<number | null>(null),
      subCategory: new FormControl<number | null>(null),
      tradeCategory: new FormControl<number | null>(null),
      genre: new FormControl<number | null>(null),
      keywords: new FormControl<string>(''),
      isUniqueIdentifier: new FormControl<boolean>(false),
      keywordOption: new FormControl<string>('auto'),
      manualKeywords: new FormControl<string>(''),
      autoKeywords: new FormControl<string>({ value: '', disabled: true }),
      publisher: new FormGroup<PublisherFormGroup>({
        id: new FormControl<number | null>(null),
        name: new FormControl<string>(''),
        keepSame: new FormControl<boolean>(true),
        displayName: new FormControl<string>(''),
      }),
      publisherDisplay: new FormControl<string>('', Validators.required),
      authorIds: new FormArray<FormGroup<AuthorFormGroup>>([
        new FormGroup<AuthorFormGroup>({
          id: new FormControl<number | null>(null),
          name: new FormControl<string>(''),
          keepSame: new FormControl<boolean>(true),
          displayName: new FormControl<string>(''),
          authorPrintPrice: new FormControl<number | null>(null),
        }),
      ]),
      isbnPrint: new FormControl<string | null>(null, {
        validators: [this.isbn13Validator()],
      }),
      isbnEbook: new FormControl<string | null>(null, {
        validators: [this.isbn13Validator()],
      }),
      isEbookIsbnAutoGenerated: new FormControl(false),
      launch_date: new FormControl<string | null>(null, Validators.required),
    });
  }

  createPrintingGroupTemp(): FormGroup<PrintingFormGroup> {
    return new FormGroup<PrintingFormGroup>({
      id: new FormControl<number | null>(null),
      bookBindingsId: new FormControl<number | null>(null, Validators.required),
      totalPages: new FormControl<number>(
        {
          value: 100,
          disabled: true,
        },
        {
          validators: [Validators.required, Validators.min(1)],
          nonNullable: true,
        }
      ),
      colorPages: new FormControl<number>(0, {
        validators: [Validators.required],
        nonNullable: true,
      }),
      isColorPagesRandom: new FormControl<boolean>(true, {
        nonNullable: true,
      }),
      bwPages: new FormControl<number>(0, {
        validators: [Validators.required],
        nonNullable: true,
      }),
      insideCover: new FormControl<boolean>(false, { nonNullable: true }),
      laminationTypeId: new FormControl<number | null>(
        null,
        Validators.required
      ),
      paperType: new FormControl<string>('WHITE', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      paperQuailtyId: new FormControl<number | null>(null, Validators.required),
      sizeCategoryId: new FormControl<number | null>(null, Validators.required),
      msp: new FormControl<number | null>(null),
      printingPrice: new FormControl<number | null>(null),
      customPrintCost: new FormControl<number | null>(null),
    });
  }

  async manageManuscriptMedia(
    publishingType: PublishingType | null | undefined
  ) {
    // Find all MANUSCRIPT controls to handle duplicates
    const manuscriptControls =
      this.tempForm.controls.documentMedia.controls.filter(
        ({ controls: { mediaType } }) => mediaType.value === 'MANUSCRIPT'
      );

    const isEbookType =
      publishingType === PublishingType.ONLY_EBOOK ||
      publishingType === PublishingType.PRINT_EBOOK;

    if (isEbookType) {
      // Remove any duplicate MANUSCRIPT controls first
      if (manuscriptControls.length > 1) {
        // Keep the first one, remove the rest
        for (let i = manuscriptControls.length - 1; i > 0; i--) {
          const index = this.tempForm.controls.documentMedia.controls.indexOf(
            manuscriptControls[i]
          );
          if (index >= 0) {
            this.tempForm.controls.documentMedia.removeAt(index);
          }
        }
      }

      // Add MANUSCRIPT if it doesn't exist
      if (manuscriptControls.length === 0) {
        const existingManuscript = this.titleDetails()?.media?.find(
          ({ type }) => type === 'MANUSCRIPT'
        );
        this.tempForm.controls.documentMedia.push(
          await this.createMedia(
            TitleMediaType.MANUSCRIPT,
            true,
            existingManuscript
          )
        );
      }
    } else {
      // Remove all MANUSCRIPT controls for non-ebook types
      if (manuscriptControls.length > 0) {
        // Remove from end to avoid index shifting issues
        for (let i = manuscriptControls.length - 1; i >= 0; i--) {
          const index = this.tempForm.controls.documentMedia.controls.findIndex(
            ({ controls }) => controls.mediaType.value === 'MANUSCRIPT'
          );
          if (index >= 0) {
            this.tempForm.controls.documentMedia.removeAt(index);
          }
        }
      }
    }
  }

  handelInsideCoverMedia() {
    this.tempForm.controls.printing.controls.insideCover.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(async (insideCover) => {
        const insideCoverControl =
          this.tempForm.controls.documentMedia.controls.find(
            ({ controls: { mediaType } }) => mediaType.value === 'INSIDE_COVER'
          );
        if (insideCover && !insideCoverControl) {
          this.tempForm.controls.documentMedia.push(
            await this.createMedia(TitleMediaType.INSIDE_COVER, true)
          );
        } else {
          const insideCoverMediaIndex =
            this.tempForm.controls.documentMedia.controls.findIndex(
              ({ controls }) => controls.mediaType.value === 'INSIDE_COVER'
            );

          if (insideCoverMediaIndex >= 0) {
            this.tempForm.controls.documentMedia.removeAt(
              insideCoverMediaIndex
            );
          }
        }
      });

    // Subscribe to specific printing field changes to recalculate MSP
    // Only subscribe to fields that affect cost calculation, not the entire form
    // This prevents infinite loops when MSP is updated
    const printingControls = this.tempForm.controls.printing.controls;

    combineLatest([
      printingControls.totalPages.valueChanges.pipe(
        startWith(printingControls.totalPages.value)
      ),
      printingControls.colorPages.valueChanges.pipe(
        startWith(printingControls.colorPages.value)
      ),
      printingControls.bwPages.valueChanges.pipe(
        startWith(printingControls.bwPages.value)
      ),
      printingControls.bookBindingsId.valueChanges.pipe(
        startWith(printingControls.bookBindingsId.value)
      ),
      printingControls.laminationTypeId.valueChanges.pipe(
        startWith(printingControls.laminationTypeId.value)
      ),
      printingControls.paperQuailtyId.valueChanges.pipe(
        startWith(printingControls.paperQuailtyId.value)
      ),
      printingControls.sizeCategoryId.valueChanges.pipe(
        startWith(printingControls.sizeCategoryId.value)
      ),
      printingControls.insideCover.valueChanges.pipe(
        startWith(printingControls.insideCover.value)
      ),
      printingControls.isColorPagesRandom.valueChanges.pipe(
        startWith(printingControls.isColorPagesRandom.value)
      ),
      // Note: customPrintCost is excluded from this subscription to prevent circular updates
      // It's already included in the API payload when calculatePrintingCost is called
      // Validation is handled separately in temp-title-printing component
    ])
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.calculatePrintingCost();
        // Update author print price validators when printing cost changes
        this.updateAuthorPrintPriceValidators();
      });

    // Note: customPrintCost calculation is now triggered only on blur after validation
    // See temp-title-printing component for blur handler
  }

  async addDefaultMediaArray(medias?: TitleMedia[]) {
    const mediaArrayControl = this.tempForm.controls.documentMedia;

    mediaArrayControl.push(
      await this.createMedia(
        TitleMediaType.FRONT_COVER,
        true,
        medias?.find(({ type }) => type === 'FRONT_COVER')
      )
    );
    mediaArrayControl.push(
      await this.createMedia(
        TitleMediaType.BACK_COVER,
        false,
        medias?.find(({ type }) => type === 'BACK_COVER')
      )
    );
    mediaArrayControl.push(
      await this.createMedia(
        TitleMediaType.INTERIOR,
        true,
        medias?.find(({ type }) => type === 'INTERIOR')
      )
    );

    if (
      this.tempForm.controls.publishingType.value !== PublishingType.ONLY_EBOOK
    ) {
      mediaArrayControl.push(
        await this.createMedia(
          TitleMediaType.FULL_COVER,
          true,
          medias?.find(({ type }) => type === 'FULL_COVER')
        )
      );
    }

    // Note: MANUSCRIPT is handled by manageManuscriptMedia() method
    // to avoid duplication when publishing type changes

    if (this.tempForm.controls.printing.controls.insideCover.value) {
      mediaArrayControl.push(
        await this.createMedia(
          TitleMediaType.INSIDE_COVER,
          true,
          medias?.find(({ type }) => type === 'INSIDE_COVER')
        )
      );
    }
  }

  async createMedia(
    mediaType: TitleMediaType,
    required = true,
    media?: TitleMedia
  ): Promise<FormGroup<TitleMediaGroup>> {
    let maxSize: number | null = null;

    const format: string[] = [];
    switch (mediaType) {
      case 'FULL_COVER':
        maxSize = 20;
        break;
      case 'INTERIOR':
        maxSize = 10;
        break;
      case 'BACK_COVER':
      case 'FRONT_COVER':
      case 'INSIDE_COVER':
        maxSize = 2;
        break;
      case 'MANUSCRIPT':
        maxSize = 50;
        format.push('.docx', '.doc');
        break;
    }

    let size = 0;
    if (media?.url) {
      try {
        const res = await getFileSizeFromS3Url(media.url);
        if (res && typeof res === 'number' && res > 0) {
          size = Number((res / (1024 * 1024)).toFixed(2));
        }
      } catch (error) {
        console.error('Error getting file size from S3:', error);
        // Continue with size 0 if we can't get the size
      }
    }

    return new FormGroup<TitleMediaGroup>({
      id: new FormControl(media?.id || null),
      url: new FormControl(media?.url, {
        validators: required ? Validators.required : [],
      }),
      type: new FormControl(mediaType, { nonNullable: true }),
      file: new FormControl(null, {
        validators: media?.id ? null : [Validators.required],
      }),
      mediaType: new FormControl<TitleMediaType>(mediaType, {
        nonNullable: true,
      }),
      maxSize: new FormControl(maxSize),
      name: new FormControl(media?.name || null),
      allowedFormat: new FormControl(format, { nonNullable: true }),
      size: new FormControl(size),
      noOfPages: new FormControl(media?.noOfPages || 0),
    });
  }

  isRequired(control: AbstractControl | null): boolean {
    if (!control?.validator) return false;
    const validator = control.validator({} as any);
    return !!(validator && validator['required']);
  }

  async onFileSelected(event: Event, mediaGroup: FormGroup<TitleMediaGroup>) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);

    if (!file) {
      return;
    }

    // Validate file size
    if (!file.size || file.size <= 0) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('invalidfile') ||
          'Invalid file selected.',
      });
      return;
    }

    const fileSizeInMB = file.size / (1024 * 1024);
    const maxAllowedSize = mediaGroup.controls.maxSize.value;

    if (maxAllowedSize && fileSizeInMB > maxAllowedSize) {
      const errorText = `Maximum allowed size is (${maxAllowedSize} MB) <br> Uploaded file is (${fileSizeInMB.toFixed(
        2
      )} MB)`;
      Swal.fire({
        icon: 'error',
        title: 'Incorrect file size',
        html: errorText,
      });
      // Reset the input
      if (input) {
        input.value = '';
      }
      return;
    }

    try {
      const url = await getFileToBase64(file);

      if (!url) {
        throw new Error('Failed to convert file to base64');
      }

      mediaGroup.patchValue({
        url,
        file,
        name: file.name,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('fileuploaderror') ||
          'Failed to process file. Please try again.',
      });
      // Reset the input
      if (input) {
        input.value = '';
      }
    }
  }

  removeFile(index: number) {
    const mediaArray = this.tempForm.controls.documentMedia;
    if (index >= 0 && index < mediaArray.length) {
      mediaArray.at(index).patchValue({
        file: null,
        url: null,
      });
    }
  }
  private removeEmptyStrings<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.removeEmptyStrings(item))
        .filter((item) => item !== undefined) as unknown as T;
    }

    // Handle objects
    if (value !== null && typeof value === 'object') {
      const result: any = {};
      Object.entries(value as any).forEach(([key, val]) => {
        const cleaned = this.removeEmptyStrings(val);
        // Drop keys where final value is an empty string or undefined
        if (cleaned === '' || cleaned === undefined) {
          return;
        }
        result[key] = cleaned;
      });
      return result as T;
    }
    if (value === '') {
      return undefined as T;
    }
    return value;
  }

  async onTitleSubmit() {
    // Mark all fields as touched to show validation errors
    if (!this.tempForm.controls.titleDetails.valid) {
      this.tempForm.controls.titleDetails.markAllAsTouched();

      // Log validation errors for debugging
      this.logFormValidationErrors(this.tempForm.controls.titleDetails);
      return;
    }

    const titleDetails = this.tempForm.controls.titleDetails?.value;
    const validAuthors = (titleDetails.authorIds || [])
      .filter((author: any) => !!author?.id)
      .map((author: any) => ({
        id: author.id,
        displayName: author.displayName || '',
        authorPrintPrice:
          author.authorPrintPrice !== null &&
          author.authorPrintPrice !== undefined &&
          !isNaN(Number(author.authorPrintPrice))
            ? Number(author.authorPrintPrice)
            : undefined,
      }));
    const basicData: TitleCreate = {
      publishingType: this.tempForm.controls.publishingType
        .value as PublishingType,
      isbnPrint: titleDetails?.isbnPrint
        ? cleanIsbn(titleDetails?.isbnPrint)
        : undefined,
      isbnEbook:
        this.tempForm.controls.titleDetails.controls.isEbookIsbnAutoGenerated
          .value ? (this.tempForm.controls.titleDetails.controls.isbnEbook.value as string ?? undefined) : (cleanIsbn(
          this.tempForm.controls.titleDetails.controls.isbnEbook.value as string
        ) ?? undefined),
      isEbookIsbnAutoGenerated:
        this.tempForm.controls.titleDetails.controls.isEbookIsbnAutoGenerated
          .value,
      categoryId: titleDetails.category as number,
      subCategoryId: titleDetails.subCategory as number,
      tradeCategoryId: titleDetails.tradeCategory as number,
      genreId: titleDetails.genre as number,
      publisherDisplay:
        this.loggedInUser()?.accessLevel === 'PUBLISHER'
          ? this.loggedInUser()?.publisher?.name
          : (titleDetails.publisher?.displayName as string),
      publisherId:
        this.loggedInUser()?.accessLevel === 'PUBLISHER'
          ? this.loggedInUser()?.publisher?.id
          : (titleDetails.publisher?.id as number),
      name: titleDetails.name as string,
      subTitle: titleDetails.subTitle as string,
      subject: titleDetails.subject as string,
      language: titleDetails.language,
      longDescription: titleDetails.longDescription,
      shortDescription: titleDetails.shortDescription,
      edition: titleDetails.edition,
      keywords: titleDetails.keywords,
      printingOnly: this.tempForm.controls.printingFormat.value === 'printOnly',
      isUniqueIdentifier: false,
      launch_date: (() => {
        // Get the actual form control value which may be a Date object
        const dateControlValue: any =
          this.tempForm.controls.titleDetails.controls.launch_date.value;
        if (!dateControlValue) return undefined;

        // If it's a Date object (from date picker), format it
        if (
          dateControlValue instanceof Date &&
          !isNaN(dateControlValue.getTime())
        ) {
          return format(dateControlValue, 'yyyy-MM-dd');
        }

        // If it's already in YYYY-MM-DD format, return as is
        if (
          typeof dateControlValue === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(dateControlValue)
        ) {
          return dateControlValue;
        }

        // If it's a string in ISO format, extract YYYY-MM-DD
        if (typeof dateControlValue === 'string') {
          return dateControlValue.split('T')[0];
        }

        // Fallback: try to parse and format
        try {
          const parsedDate = new Date(dateControlValue);
          if (!isNaN(parsedDate.getTime())) {
            return format(parsedDate, 'yyyy-MM-dd');
          }
        } catch {
          // Ignore parsing errors
        }
        return undefined;
      })(),
      ...(validAuthors.length > 0 && { authorIds: validAuthors }),
      id: this.titleId,
    } as TitleCreate;
    const finalbasicData = this.removeEmptyStrings(basicData) as TitleCreate;
    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      // Check if title is approved and user is publisher - create update ticket instead
      if (
        this.titleId &&
        this.titleDetails()?.status === TitleStatus.APPROVED &&
        this.loggedInUser()?.accessLevel === 'PUBLISHER'
      ) {
        // Create update ticket for approved titles when user is publisher
        await this.titleService.createTitleUpdateTicket(
          this.titleId,
          finalbasicData
        );

        // Show success message
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        // Reset form to prefill with actual details
        try {
          const response = await this.titleService.getTitleById(this.titleId);
          if (response) {
            this.titleDetails.set(response);
            this.prefillFormData(response);
            this.mapRoyaltiesArray(
              response.publisher,
              response.authors?.map(({ author }) => author) || []
            );
          }
        } catch (reloadError) {
          console.error('Error reloading title:', reloadError);
          // Continue even if reload fails
        }

        return; // Don't proceed with normal update flow
      }
      const res = await this.titleService.createTitle(finalbasicData);

      if (!res?.id || isNaN(Number(res.id))) {
        throw new Error('Invalid response from server');
      }

      this.titleId = Number(res.id);
      this.isNewTitle = false;

      // Ensure publisher is set for publisher users after title creation
      if (
        !this.publisherSignal() &&
        this.loggedInUser()?.accessLevel === 'PUBLISHER' &&
        this.loggedInUser()?.publisher
      ) {
        this.publisherSignal.set(this.loggedInUser()?.publisher as Publishers);
      }

      // Update URL to include the title ID to prevent creating new title on refresh
      // When titleId changes, format step disappears, so we're now on 'details' step
      // Set current step to 'details' explicitly so goToNextStep() knows where we are
      this.currentStep.set('details');
      const targetStep = 'details';

      // Update URL with titleId and current step
      this.router.navigate(['/title', this.titleId], {
        replaceUrl: true,
        queryParams: {
          ...this.route.snapshot.queryParams,
          step: targetStep,
        },
      });

      // Move to next step (documents) after URL update completes
      // Use a small delay to ensure stepper has updated after titleId change
      queueMicrotask(() => {
        // Ensure stepper reflects the new step order (format step removed)
        const stepperInstance = this.stepper();
        if (stepperInstance) {
          // Find the details step index in the new step order
          const stepOrder = this.getStepOrder();
          const detailsIndex = stepOrder.indexOf('details');
          if (
            detailsIndex !== -1 &&
            detailsIndex < stepperInstance.steps.length
          ) {
            stepperInstance.selectedIndex = detailsIndex;
            this.cdr.markForCheck();
          }
        }
        // Now move to next step (documents)
        this.goToNextStep();
      });
    } catch (error) {
      console.error('Error creating title:', error);
      this.errorMessage.set(
        this.translateService.instant('errorcreatingtitle') ||
          'Failed to create title. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onMediaUpload() {
    if (!this.tempForm.controls.documentMedia.valid) {
      return;
    }

    if (!this.titleId || this.titleId <= 0) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('titleidrequired') ||
          'Title ID is required. Please save title details first.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      // Only upload files that have a new file selected (not already uploaded)
      // A file is considered "new" if:
      // 1. There's a file in the form control, AND
      // 2. Either there's no id (new upload) or there's a file (replacement)
      const mediaToUpload = this.tempForm.controls.documentMedia.value
        .filter(({ file, type }) => {
          // Only include if there's a file and type
          return file && type;
        })
        .map(({ file, type }) => ({
          file: file as File,
          type: type as TitleMediaType,
        }));

      // Check if raising ticket for approved title
      if (this.isRaisingTicket()) {
        // Upload media via update ticket API
        const mediaResponse =
          await this.titleService.uploadMultiMediaForUpdateTicket(
            this.titleId,
            mediaToUpload
          );

        if (mediaResponse && Array.isArray(mediaResponse)) {
          const interior = mediaResponse.find(
            (item: any) => item?.type === TitleMediaType.INTERIOR
          ) as any;

          if (interior?.noOfPages && typeof interior.noOfPages === 'number') {
            this.tempForm.controls.printing.controls.totalPages.patchValue(
              interior.noOfPages
            );
            // Auto-calculate black and white pages and MSP after form state is updated
            queueMicrotask(() => {
              this.calculateBlackAndWhitePages();
              // Recalculate printing cost (MSP) when totalPages changes
              // This will calculate if all required fields are available
              this.calculatePrintingCost();
              this.cdr.markForCheck();
            });
          }

          // Clear file controls after successful upload to prevent duplicate uploads
          // Update form with uploaded media data (id, url) and clear file
          mediaResponse.forEach((uploadedMedia: any) => {
            const mediaControl =
              this.tempForm.controls.documentMedia.controls.find(
                (control) => control.controls.type.value === uploadedMedia.type
              );

            if (mediaControl) {
              const hasId = uploadedMedia.id || mediaControl.controls.id.value;
              // Update validators: if id exists, file is not required
              if (hasId) {
                mediaControl.controls.file.removeValidators(
                  Validators.required
                );
              }

              mediaControl.patchValue({
                id: hasId,
                url: uploadedMedia.url || mediaControl.controls.url.value,
                name: uploadedMedia.name || mediaControl.controls.name.value,
                file: null, // Clear file to prevent duplicate upload
                noOfPages:
                  uploadedMedia.noOfPages ||
                  mediaControl.controls.noOfPages.value,
              });

              // Update validity after patching
              if (hasId) {
                mediaControl.controls.file.updateValueAndValidity();
              }
            }
          });

          // Ensure form array is valid after updates
          this.tempForm.controls.documentMedia.updateValueAndValidity();
        }

        // Show success message
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        // Reset form to prefill with actual details
        try {
          const response = await this.titleService.getTitleById(this.titleId);
          if (response) {
            this.titleDetails.set(response);
            this.prefillFormData(response);
          }
        } catch (reloadError) {
          console.error('Error reloading title:', reloadError);
        }

        return; // Don't proceed with normal flow
      }

      // Normal upload flow
      const mediaResponse = await this.titleService.uploadMultiMedia(
        this.titleId,
        mediaToUpload
      );

      if (mediaResponse && Array.isArray(mediaResponse)) {
        const interior = mediaResponse.find(
          ({ type }) => type === TitleMediaType.INTERIOR
        );

        if (interior?.noOfPages && typeof interior.noOfPages === 'number') {
          this.tempForm.controls.printing.controls.totalPages.patchValue(
            interior.noOfPages
          );
          // Auto-calculate black and white pages and MSP after form state is updated
          queueMicrotask(() => {
            this.calculateBlackAndWhitePages();
            // Recalculate printing cost (MSP) when totalPages changes
            // This will calculate if all required fields are available
            this.calculatePrintingCost();
            this.cdr.markForCheck();
          });
        }

        // Clear file controls after successful upload to prevent duplicate uploads
        // Update form with uploaded media data (id, url) and clear file
        mediaResponse.forEach((uploadedMedia: any) => {
          const mediaControl =
            this.tempForm.controls.documentMedia.controls.find(
              (control) => control.controls.type.value === uploadedMedia.type
            );

          if (mediaControl) {
            const hasId = uploadedMedia.id || mediaControl.controls.id.value;
            // Update validators: if id exists, file is not required
            if (hasId) {
              mediaControl.controls.file.removeValidators(Validators.required);
            }

            mediaControl.patchValue({
              id: hasId,
              url: uploadedMedia.url || mediaControl.controls.url.value,
              name: uploadedMedia.name || mediaControl.controls.name.value,
              file: null, // Clear file to prevent duplicate upload
              noOfPages:
                uploadedMedia.noOfPages ||
                mediaControl.controls.noOfPages.value,
            });

            // Update validity after patching
            if (hasId) {
              mediaControl.controls.file.updateValueAndValidity();
            }
          }
        });

        // Ensure form array is valid after updates
        this.tempForm.controls.documentMedia.updateValueAndValidity();
      }

      if (
        this.tempForm.controls.printingFormat.value === 'printOnly' &&
        this.tempForm.controls.publishingType.value ===
          PublishingType.ONLY_EBOOK
      ) {
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('titlesentforapproval') ||
            'Title has been sent for approval to the admin.',
        }).then(() => {
          this.router.navigate(['/titles']);
        });

        return;
      }

      // Move to next step after successful submission
      this.goToNextStep();
    } catch (error) {
      console.error('Error uploading media:', error);
      this.errorMessage.set(
        this.translateService.instant('erroruploadingmedia') ||
          'Failed to upload media files. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onPricingSubmit() {
    const pricingControls = this.tempForm.controls.pricing;
    const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';

    // For publishers, check validity excluding superadmin-only platforms without pricing
    if (isPublisher) {
      const hasInvalidControl = pricingControls.controls.some((control) => {
        const platformName = control.controls.platform.value as string | null;
        if (!platformName) {
          return !control.valid;
        }
        const platform = this.platformService.getPlatformByName(platformName);
        const isSuperAdminOnly = platform?.isSuperAdminPricingOnly ?? false;

        // Skip validation for superadmin-only platforms without pricing
        if (isSuperAdminOnly) {
          const hasPricing =
            control.controls.id.value != null ||
            control.controls.salesPrice.value != null ||
            control.controls.mrp.value != null;
          if (!hasPricing) {
            return false; // Don't count as invalid
          }
        }

        return !control.valid;
      });

      if (hasInvalidControl) {
        return;
      }
    } else {
      // For superadmins, check all controls
      if (!pricingControls.valid) {
        return;
      }
    }

    if (!this.titleId || this.titleId <= 0) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('titleidrequired') ||
          'Title ID is required.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const publishingType = this.tempForm.controls.publishingType.value;
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

      // Filter controls based on publishing type
      // For PRINT_EBOOK, include ALL platforms (both ebook and print)
      const controlsToCheck = isOnlyEbook
        ? pricingControls.controls.filter((control) => {
            const platformName = control.controls.platform.value as
              | string
              | null;
            const platform = platformName
              ? this.platformService.getPlatformByName(platformName)
              : null;
            return platform?.isEbookPlatform ?? false;
          })
        : isOnlyPrint
        ? pricingControls.controls.filter((control) => {
            const platformName = control.controls.platform.value as
              | string
              | null;
            const platform = platformName
              ? this.platformService.getPlatformByName(platformName)
              : null;
            return !(platform?.isEbookPlatform ?? false);
          })
        : pricingControls.controls; // PRINT_EBOOK: include all platforms

      // Collect validation errors instead of silently filtering
      const validationErrors: string[] = [];
      const data: PricingCreate[] = [];

      for (const control of controlsToCheck) {
        const { platform, id, mrp, salesPrice } = control.controls;
        const platformName = platform.value as string;

        if (!platformName) {
          validationErrors.push(
            'Platform name is missing for one or more pricing entries.'
          );
          continue;
        }

        const platformObj =
          this.platformService.getPlatformByName(platformName);
        if (!platformObj) {
          validationErrors.push(`Platform '${platformName}' not found.`);
          continue;
        }

        // For publishers, skip validation for superadmin-only platforms without pricing
        const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';
        if (isPublisher && platformObj.isSuperAdminPricingOnly) {
          const hasPricing =
            id.value != null || salesPrice.value != null || mrp.value != null;
          // If pricing doesn't exist, skip this platform (publisher can't fill it)
          if (!hasPricing) {
            continue;
          }
        }

        // Double-check platform is valid based on publishing type
        // For PRINT_EBOOK (when both isOnlyEbook and isOnlyPrint are false),
        // include ALL platforms (both ebook and print)
        if (isOnlyEbook && !platformObj.isEbookPlatform) {
          continue; // Skip non-ebook platforms for ebook-only titles
        }
        if (isOnlyPrint && platformObj.isEbookPlatform) {
          continue; // Skip ebook platforms for print-only titles
        }
        // PRINT_EBOOK: Include all platforms (both ebook and print)

        // Basic validation - check if all required fields have valid values
        if (
          mrp.value === null ||
          mrp.value === undefined ||
          mrp.value === '' ||
          salesPrice.value === null ||
          salesPrice.value === undefined ||
          salesPrice.value === '' ||
          isNaN(Number(mrp.value)) ||
          isNaN(Number(salesPrice.value)) ||
          Number(mrp.value) <= 0 ||
          Number(salesPrice.value) <= 0
        ) {
          validationErrors.push(
            `Platform ${platformName}: Please provide valid MRP and Sales Price (both must be greater than 0).`
          );
          continue;
        }

        // Validate MSP before creating pricing data
        const platformMsp = this.getMspForPlatform(platformObj.id);
        const salesPriceValue = Number(salesPrice.value);
        const mrpValue = Number(mrp.value);

        // Check if sales price is lower than MSP
        if (platformMsp > 0 && salesPriceValue < platformMsp) {
          validationErrors.push(
            `Platform ${platformName}: Sales price (${salesPriceValue}) cannot be lower than MSP (${platformMsp.toFixed(
              2
            )}).`
          );
          continue;
        }

        // Check if MRP is lower than MSP
        if (platformMsp > 0 && mrpValue < platformMsp) {
          validationErrors.push(
            `Platform ${platformName}: MRP (${mrpValue}) cannot be lower than MSP (${platformMsp.toFixed(
              2
            )}).`
          );
          continue;
        }

        // Check if sales price is higher than MRP
        if (salesPriceValue > mrpValue) {
          validationErrors.push(
            `Platform ${platformName}: Sales price (${salesPriceValue}) cannot be higher than MRP (${mrpValue}).`
          );
          continue;
        }

        // All validations passed, add to pricing data
        data.push({
          id: id.value ?? undefined,
          platformId: platformObj.id,
          mrp: mrpValue,
          salesPrice: salesPriceValue,
        } as PricingCreate);
      }

      // If there are validation errors, show them and return early
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.join('\n');
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Validation Error',
          html: `<div style="text-align: left;">${errorMessage.replace(
            /\n/g,
            '<br>'
          )}</div>`,
          width: '600px',
        });
        return;
      }

      if (!data.length) {
        // Check which platforms are missing data for better error message
        const missingPlatforms: string[] = [];
        controlsToCheck.forEach((control) => {
          const { platform, mrp, salesPrice } = control.controls;
          const hasValidData =
            platform.value &&
            mrp.value !== null &&
            mrp.value !== undefined &&
            mrp.value !== '' &&
            salesPrice.value !== null &&
            salesPrice.value !== undefined &&
            salesPrice.value !== '' &&
            !isNaN(Number(mrp.value)) &&
            !isNaN(Number(salesPrice.value)) &&
            Number(mrp.value) > 0 &&
            Number(salesPrice.value) > 0;

          if (!hasValidData && platform.value) {
            missingPlatforms.push(platform.value as string);
          }
        });

        let errorMessage: string;
        if (isOnlyEbook) {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidebookpricingdata') ||
              `Please provide valid pricing data (MRP and Sales Price) for at least one ebook platform. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidebookpricingdata') ||
              'Please provide valid pricing data for at least one ebook platform (MAH_EBOOK, KINDLE, or GOOGLE_PLAY).';
          }
        } else if (isOnlyPrint) {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidprintpricingdata') ||
              `Please provide valid pricing data (MRP and Sales Price) for at least one print platform. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidprintpricingdata') ||
              'Please provide valid pricing data for at least one print platform (AMAZON, FLIPKART, or MAH_PRINT).';
          }
        } else {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidpricingdata') ||
              `Please provide valid pricing data (MRP and Sales Price) for all platforms. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidpricingdata') ||
              'Please provide valid pricing data.';
          }
        }

        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning'),
          text: errorMessage,
        });
        return;
      }

      // Check if raising ticket for approved title
      if (this.isRaisingTicket()) {
        // Create pricing update ticket
        await this.titleService.createPricingUpdateTicket(this.titleId, {
          data,
        });

        // Show success message
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        // Reset form to prefill with actual details
        try {
          const response = await this.titleService.getTitleById(this.titleId);
          if (response) {
            this.titleDetails.set(response);
            this.prefillFormData(response);
          }
        } catch (reloadError) {
          console.error('Error reloading title:', reloadError);
        }

        return; // Don't proceed with normal flow
      }

      // Normal update flow
      await this.titleService.createManyPricing(data, this.titleId);

      // Ensure publisher is set for publisher users
      let publisher = this.publisherSignal();
      if (
        !publisher &&
        this.loggedInUser()?.accessLevel === 'PUBLISHER' &&
        this.loggedInUser()?.publisher
      ) {
        // Set publisher from logged in user if not already set
        this.publisherSignal.set(this.loggedInUser()?.publisher as Publishers);
        publisher = this.loggedInUser()?.publisher as Publishers;
      }

      const authors = this.authorsSignal();

      if (publisher) {
        this.mapRoyaltiesArray(publisher, authors);
      }

      // Move to next step after successful submission
      this.goToNextStep();
    } catch (error: any) {
      console.error('Error saving pricing:', error);
      let errorMessage =
        this.translateService.instant('errorsavingpricing') ||
        'Failed to save pricing. Please try again.';

      // Show more specific error message from API if available
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: errorMessage,
      });

      this.errorMessage.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Combined submit handler for pricing and royalties
   * Saves both pricing and royalties together
   */
  async onPricingAndRoyaltySubmit() {
    const pricingControls = this.tempForm.controls.pricing;
    const royaltiesControl = this.tempForm.controls.royalties;

    // Validate both forms - check only relevant platforms
    const publishingType = this.tempForm.controls.publishingType.value;
    const isOnlyEbook = publishingType === PublishingType.ONLY_EBOOK;
    const isOnlyPrint = publishingType === PublishingType.ONLY_PRINT;
    // Check validity only for relevant platforms
    const relevantControls = isOnlyEbook
      ? pricingControls.controls.filter((control) => {
          const platformName = control.controls.platform.value as string | null;
          const platform = platformName
            ? this.platformService.getPlatformByName(platformName)
            : null;
          return platform?.isEbookPlatform ?? false;
        })
      : isOnlyPrint
      ? pricingControls.controls.filter((control) => {
          const platformName = control.controls.platform.value as string | null;
          const platform = platformName
            ? this.platformService.getPlatformByName(platformName)
            : null;
          return !(platform?.isEbookPlatform ?? false);
        })
      : pricingControls.controls;

    const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';

    // For publishers, exclude superadmin-only platforms without pricing from validation
    const hasInvalidRelevantControl = relevantControls.some((control) => {
      if (isPublisher) {
        const platformName = control.controls.platform.value as string | null;
        if (platformName) {
          const platform = this.platformService.getPlatformByName(platformName);
          const isSuperAdminOnly = platform?.isSuperAdminPricingOnly ?? false;

          // Skip validation for superadmin-only platforms without pricing
          if (isSuperAdminOnly) {
            const hasPricing =
              control.controls.id.value != null ||
              control.controls.salesPrice.value != null ||
              control.controls.mrp.value != null;
            if (!hasPricing) {
              return false; // Don't count as invalid
            }
          }
        }
      }

      return !control.valid;
    });

    if (hasInvalidRelevantControl) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning'),
        text:
          this.translateService.instant('invalidpricingdata') ||
          'Please check pricing fields.',
      });
      return;
    }

    if (!royaltiesControl.valid) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning'),
        text:
          this.translateService.instant('invalidroyaltiesdata') ||
          'Please check royalty fields.',
      });
      return;
    }

    if (!this.titleId || this.titleId <= 0) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('titleidrequired') ||
          'Title ID is required.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      // Prepare pricing data
      const publishingType = this.tempForm.controls.publishingType.value;
      const isOnlyEbook = publishingType === PublishingType.ONLY_EBOOK;
      const isOnlyPrint = publishingType === PublishingType.ONLY_PRINT;

      // Filter controls based on publishing type
      // For PRINT_EBOOK, include ALL platforms (both ebook and print)
      const controlsToCheck = isOnlyEbook
        ? pricingControls.controls.filter((control) => {
            const platformName = control.controls.platform.value as
              | string
              | null;
            const platform = platformName
              ? this.platformService.getPlatformByName(platformName)
              : null;
            return platform?.isEbookPlatform ?? false;
          })
        : isOnlyPrint
        ? pricingControls.controls.filter((control) => {
            const platformName = control.controls.platform.value as
              | string
              | null;
            const platform = platformName
              ? this.platformService.getPlatformByName(platformName)
              : null;
            return !(platform?.isEbookPlatform ?? false);
          })
        : pricingControls.controls; // PRINT_EBOOK: include all platforms

      // Collect validation errors instead of silently filtering
      const validationErrors: string[] = [];
      const pricingData: PricingCreate[] = [];

      for (const control of controlsToCheck) {
        const { platform, id, mrp, salesPrice } = control.controls;
        const platformName = platform.value as string;

        if (!platformName) {
          validationErrors.push(
            'Platform name is missing for one or more pricing entries.'
          );
          continue;
        }

        const platformObj =
          this.platformService.getPlatformByName(platformName);
        if (!platformObj) {
          validationErrors.push(`Platform '${platformName}' not found.`);
          continue;
        }

        // For publishers, skip validation for superadmin-only platforms without pricing
        const isPublisher = this.loggedInUser()?.accessLevel === 'PUBLISHER';
        if (isPublisher && platformObj.isSuperAdminPricingOnly) {
          const hasPricing =
            id.value != null || salesPrice.value != null || mrp.value != null;
          // If pricing doesn't exist, skip this platform (publisher can't fill it)
          if (!hasPricing) {
            continue;
          }
        }

        // For PRINT_EBOOK, we need to include ALL platforms (both ebook and print)
        // So we only filter by platform type for ONLY_EBOOK and ONLY_PRINT
        if (isOnlyEbook && !platformObj.isEbookPlatform) {
          continue; // Skip non-ebook platforms for ebook-only titles
        }
        if (isOnlyPrint && platformObj.isEbookPlatform) {
          continue; // Skip ebook platforms for print-only titles
        }
        // For PRINT_EBOOK (when both isOnlyEbook and isOnlyPrint are false),
        // continue processing all platforms

        // Basic validation - check if all required fields have valid values
        if (
          mrp.value === null ||
          mrp.value === undefined ||
          mrp.value === '' ||
          salesPrice.value === null ||
          salesPrice.value === undefined ||
          salesPrice.value === '' ||
          isNaN(Number(mrp.value)) ||
          isNaN(Number(salesPrice.value)) ||
          Number(mrp.value) <= 0 ||
          Number(salesPrice.value) <= 0
        ) {
          validationErrors.push(
            `Platform ${platformName}: Please provide valid MRP and Sales Price (both must be greater than 0).`
          );
          continue;
        }

        // Validate MSP before creating pricing data
        const platformMsp = this.getMspForPlatform(platformObj.id);
        const salesPriceValue = Number(salesPrice.value);
        const mrpValue = Number(mrp.value);

        // Check if sales price is lower than MSP
        if (platformMsp > 0 && salesPriceValue < platformMsp) {
          validationErrors.push(
            `Platform ${platformName}: Sales price (${salesPriceValue}) cannot be lower than MSP (${platformMsp.toFixed(
              2
            )}).`
          );
          continue;
        }

        // Check if MRP is lower than MSP
        if (platformMsp > 0 && mrpValue < platformMsp) {
          validationErrors.push(
            `Platform ${platformName}: MRP (${mrpValue}) cannot be lower than MSP (${platformMsp.toFixed(
              2
            )}).`
          );
          continue;
        }

        // Check if sales price is higher than MRP
        if (salesPriceValue > mrpValue) {
          validationErrors.push(
            `Platform ${platformName}: Sales price (${salesPriceValue}) cannot be higher than MRP (${mrpValue}).`
          );
          continue;
        }

        // All validations passed, add to pricing data
        pricingData.push({
          id: id.value ?? undefined,
          platformId: platformObj.id,
          mrp: mrpValue,
          salesPrice: salesPriceValue,
        } as PricingCreate);
      }

      // If there are validation errors, show them and return early
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.join('\n');
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error') || 'Validation Error',
          html: `<div style="text-align: left;">${errorMessage.replace(
            /\n/g,
            '<br>'
          )}</div>`,
          width: '600px',
        });
        return;
      }

      if (!pricingData.length) {
        // Check which platforms are missing data for better error message
        const missingPlatforms: string[] = [];
        controlsToCheck.forEach((control) => {
          const { platform, mrp, salesPrice } = control.controls;
          const hasValidData =
            platform.value &&
            mrp.value !== null &&
            mrp.value !== undefined &&
            mrp.value !== '' &&
            salesPrice.value !== null &&
            salesPrice.value !== undefined &&
            salesPrice.value !== '' &&
            !isNaN(Number(mrp.value)) &&
            !isNaN(Number(salesPrice.value)) &&
            Number(mrp.value) > 0 &&
            Number(salesPrice.value) > 0;

          if (!hasValidData && platform.value) {
            missingPlatforms.push(platform.value as string);
          }
        });

        let errorMessage: string;
        if (isOnlyEbook) {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidebookpricingdata') ||
              `Please provide valid pricing data (MRP and Sales Price) for at least one ebook platform. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidebookpricingdata') ||
              'Please provide valid pricing data for at least one ebook platform (MAH_EBOOK, KINDLE, or GOOGLE_PLAY).';
          }
        } else if (isOnlyPrint) {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidprintpricingdata') ||
              `Please provide valid pricing data (MRP and Sales Price) for at least one print platform. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidprintpricingdata') ||
              'Please provide valid pricing data for at least one print platform (AMAZON, FLIPKART, or MAH_PRINT).';
          }
        } else {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidpricingdata') ||
              `Please provide valid pricing data (MRP and Sales Price) for all platforms. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidpricingdata') ||
              'Please provide valid pricing data.';
          }
        }

        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning'),
          text: errorMessage,
        });
        return;
      }

      // Prepare royalties data
      // The royalties form already has the correct structure (one entry per platform per author/publisher)
      // We just need to filter and map it correctly
      // Filter to only check relevant platform controls based on publishing type
      const royaltiesControlsToCheck = isOnlyEbook
        ? royaltiesControl.controls.filter((control) => {
            const platformName = control.controls.platform.value as
              | string
              | null;
            const platform = platformName
              ? this.platformService.getPlatformByName(platformName)
              : null;
            return platform?.isEbookPlatform ?? false;
          })
        : isOnlyPrint
        ? royaltiesControl.controls.filter((control) => {
            const platformName = control.controls.platform.value as
              | string
              | null;
            const platform = platformName
              ? this.platformService.getPlatformByName(platformName)
              : null;
            return !(platform?.isEbookPlatform ?? false);
          })
        : royaltiesControl.controls;

      // Map and filter royalties, then deduplicate by (authorId/publisherId, platform)
      const royaltiesMap = new Map<string, UpdateRoyalty>();

      royaltiesControlsToCheck.forEach(
        ({
          controls: {
            id: { value: id },
            authorId: { value: authorId },
            name: { value: name },
            percentage: { value: percentage },
            publisherId: { value: publisherId },
            platform: { value: platform },
          },
        }) => {
          // Get platform name from form control (it's stored as string)
          const platformName = platform as string;
          if (!platformName) {
            return; // Skip if no platform
          }

          // Get platform by name to get platformId (form stores platform name)
          const platformObj =
            this.platformService.getPlatformByName(platformName);
          if (!platformObj) {
            console.error(`Platform '${platformName}' not found`);
            return; // Skip if platform not found
          }

          // Basic validation - check if percentage is valid
          const rawPercentage = percentage;
          const hasValue =
            rawPercentage !== null && rawPercentage !== undefined;
          const numericPercentage = Number(rawPercentage);

          if (
            !hasValue ||
            isNaN(numericPercentage) ||
            numericPercentage < 0 ||
            numericPercentage > 100
          ) {
            return; // Skip invalid percentage
          }

          // Double-check platform is valid based on publishing type
          // For PRINT_EBOOK (when both isOnlyEbook and isOnlyPrint are false),
          // return true for ALL platforms (both ebook and print)
          if (isOnlyEbook && !platformObj.isEbookPlatform) {
            return; // Skip non-ebook platforms for ebook-only titles
          }
          if (isOnlyPrint && platformObj.isEbookPlatform) {
            return; // Skip ebook platforms for print-only titles
          }

          // Create unique key: authorId/publisherId + platformId
          const key = authorId
            ? `author_${authorId}_${platformObj.id}`
            : `publisher_${publisherId}_${platformObj.id}`;

          const royalty: UpdateRoyalty = {
            id: id || undefined,
            authorId: authorId || undefined,
            platformId: platformObj.id,
            percentage: Number(percentage),
            name: name || '',
            publisherId: publisherId || undefined,
          };

          // Deduplicate: keep entry with ID if available, otherwise keep the last occurrence
          const existing = royaltiesMap.get(key);
          if (!existing) {
            // No existing entry, add it
            royaltiesMap.set(key, royalty);
          } else if (id && !existing.id) {
            // Current has ID, existing doesn't - replace
            royaltiesMap.set(key, royalty);
          } else if (!id && existing.id) {
            // Existing has ID, current doesn't - keep existing
            // Do nothing
          } else {
            // Both have ID or both don't - keep the last one (current)
            royaltiesMap.set(key, royalty);
          }
        }
      );

      const royalties: UpdateRoyalty[] = Array.from(royaltiesMap.values());

      if (!royalties.length) {
        // Check which platforms are missing data for better error message
        const missingPlatforms: string[] = [];
        royaltiesControlsToCheck.forEach((control) => {
          const { percentage, platform } = control.controls;
          const rawPercentage = percentage.value;
          const hasValue =
            rawPercentage !== null && rawPercentage !== undefined;
          const numericPercentage = Number(rawPercentage);
          const hasValidData =
            platform.value &&
            hasValue &&
            !isNaN(numericPercentage) &&
            numericPercentage >= 0 &&
            numericPercentage <= 100;

          if (!hasValidData && platform.value) {
            missingPlatforms.push(platform.value as string);
          }
        });

        let errorMessage: string;
        if (isOnlyEbook) {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidebookroyaltiesdata') ||
              `Please provide valid royalties data (percentage between 0-100%) for at least one ebook platform. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidebookroyaltiesdata') ||
              'Please provide valid royalties data for at least one ebook platform (MAH_EBOOK, KINDLE, or GOOGLE_PLAY).';
          }
        } else if (isOnlyPrint) {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidprintroyaltiesdata') ||
              `Please provide valid royalties data (percentage between 0-100%) for at least one print platform. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidprintroyaltiesdata') ||
              'Please provide valid royalties data for at least one print platform (AMAZON, FLIPKART, or MAH_PRINT).';
          }
        } else {
          if (missingPlatforms.length > 0) {
            errorMessage =
              this.translateService.instant('invalidroyaltiesdata') ||
              `Please provide valid royalties data (percentage between 0-100%) for all platforms. Missing data for: ${missingPlatforms.join(
                ', '
              )}`;
          } else {
            errorMessage =
              this.translateService.instant('invalidroyaltiesdata') ||
              'Please provide valid royalties data.';
          }
        }

        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning'),
          text: errorMessage,
        });
        return;
      }

      // Check if raising ticket for approved title
      if (this.isRaisingTicket()) {
        // Create pricing update ticket
        await this.titleService.createPricingUpdateTicket(this.titleId, {
          data: pricingData,
        });

        // Create royalty update ticket
        await this.titleService.createRoyaltyUpdateTicket(this.titleId, {
          royalties,
        });

        // Show success message
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        // Reset form to prefill with actual details
        try {
          const response = await this.titleService.getTitleById(this.titleId);
          if (response) {
            this.titleDetails.set(response);
            this.prefillFormData(response);
          }
        } catch (reloadError) {
          console.error('Error reloading title:', reloadError);
        }

        return; // Don't proceed with normal flow
      }

      // Normal update flow - save both pricing and royalties
      await this.titleService.createManyPricing(pricingData, this.titleId);
      await this.titleService.createManyRoyalties(royalties, this.titleId);

      // Ensure publisher is set for publisher users
      let publisher = this.publisherSignal();
      if (
        !publisher &&
        this.loggedInUser()?.accessLevel === 'PUBLISHER' &&
        this.loggedInUser()?.publisher
      ) {
        // Set publisher from logged in user if not already set
        this.publisherSignal.set(this.loggedInUser()?.publisher as Publishers);
        publisher = this.loggedInUser()?.publisher as Publishers;
      }

      // Refresh royalties array after save to ensure consistency
      const authors = this.authorsSignal();
      if (publisher) {
        this.mapRoyaltiesArray(publisher, authors);
      }

      // Move to next step after successful submission
      this.goToNextStep();
    } catch (error: any) {
      console.error('Error saving pricing and royalties:', error);
      let errorMessage =
        this.translateService.instant('errorsavingpricing') ||
        'Failed to save pricing and royalties. Please try again.';

      // Show more specific error message from API if available
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: errorMessage,
      });

      this.errorMessage.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  async savePrintingDraft() {
    const printing = this.tempForm.controls.printing;
    const printingDetails = this.tempForm.get('printing')?.value;

    if (!printing?.valid) {
      return;
    }

    if (!this.titleId || this.titleId <= 0) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('titleidrequired') ||
          'Title ID is required.',
      });
      return;
    }

    const insideCoverMedia = this.tempForm.controls.documentMedia.controls.find(
      ({ controls: { type } }) => type.value === TitleMediaType.INSIDE_COVER
    );

    // Check if inside cover is enabled
    const isInsideCoverEnabled = printing.controls.insideCover.value;

    // Check if inside cover already exists in the database (from existing printing data)
    const existingInsideCover = this.titleDetails()?.printing?.[0]?.insideCover;

    // Validate: if inside cover is enabled, file or url must exist
    if (isInsideCoverEnabled) {
      const hasFile = insideCoverMedia?.controls?.file?.value;
      const hasUrl = insideCoverMedia?.controls?.url?.value;

      if (!hasFile && !hasUrl) {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error'),
          html:
            this.translateService.instant('missinginsicovermediaerror') ||
            'Inside cover image is required when inside cover is enabled.',
        });
        return;
      }
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      // Upload inside cover media if needed (only if there's a new file to upload)
      if (isInsideCoverEnabled && insideCoverMedia?.controls?.file?.value) {
        try {
          await this.titleService.uploadMedia(this.titleId, {
            file: insideCoverMedia.controls.file.value,
            type: TitleMediaType.INSIDE_COVER,
          });

          // Clear file after successful upload to prevent duplicate uploads
          insideCoverMedia.patchValue({
            file: null,
          });
        } catch (uploadError) {
          console.error('Error uploading inside cover media:', uploadError);
          Swal.fire({
            icon: 'error',
            title: this.translateService.instant('error'),
            text:
              this.translateService.instant('erroruploadingmedia') ||
              'Failed to upload inside cover media. Please try again.',
          });
          return;
        }
      }

      // Validate all required fields
      if (
        !printingDetails?.bookBindingsId ||
        !printingDetails?.laminationTypeId ||
        !printingDetails?.paperQuailtyId ||
        !printingDetails?.sizeCategoryId ||
        isNaN(Number(printingDetails.bookBindingsId)) ||
        isNaN(Number(printingDetails.laminationTypeId)) ||
        isNaN(Number(printingDetails.paperQuailtyId)) ||
        isNaN(Number(printingDetails.sizeCategoryId))
      ) {
        throw new Error('Invalid printing details');
      }

      // Get the Size ID from the form control (form control is named sizeCategoryId but contains Size ID)
      const sizeId = Number(printingDetails.sizeCategoryId);

      // Fetch the Size to get its sizeCategoryId
      const selectedSize = await this.printingService.getSizeById(sizeId);
      if (!selectedSize || !selectedSize.sizeCategory?.id) {
        throw new Error('Invalid size or size category not found');
      }

      const sizeCategoryId = selectedSize.sizeCategory.id;

      // Build printing data
      // Only include insideCover if it's being changed (not already true in database)
      const canUseCustomPrintCost =
        this.loggedInUser()?.accessLevel === 'PUBLISHER' &&
        this.loggedInUser()?.publisher?.allowCustomPrintingPrice;

      // Get customPrintCost value - only include if user has permission and value is set
      let customPrintCostValue: number | undefined = undefined;
      if (canUseCustomPrintCost) {
        // Get value directly from form control to ensure we capture the actual value
        const formControlValue = printing.controls.customPrintCost.value;
        if (
          formControlValue !== null &&
          formControlValue !== undefined &&
          !isNaN(Number(formControlValue)) &&
          Number(formControlValue) >= 0
        ) {
          customPrintCostValue = Number(formControlValue);
        }
      }

      const basePrintingData: Omit<PrintingCreate, 'insideCover'> = {
        id: printingDetails.id || undefined,
        titleId: Number(this.titleId),
        bindingTypeId: Number(printingDetails.bookBindingsId),
        totalPages: printing.controls.totalPages.value || 0,
        colorPages: Number(printingDetails.colorPages) || 0,
        laminationTypeId: Number(printingDetails.laminationTypeId),
        paperType: (printingDetails.paperType as PaperType) || 'WHITE',
        paperQuailtyId: Number(printingDetails.paperQuailtyId),
        sizeId: sizeId,
        sizeCategoryId: sizeCategoryId,
        isColorPagesRandom: printing.controls.isColorPagesRandom.value ?? false,
      };

      // Only add customPrintCost if it has a valid value
      if (customPrintCostValue !== undefined) {
        (basePrintingData as any).customPrintCost = customPrintCostValue;
      }

      // Check if raising ticket for approved title
      if (this.isRaisingTicket()) {
        // For update ticket, use Partial and only include insideCover if it's being changed
        const updateTicketData: Partial<PrintingCreate> = {
          ...basePrintingData,
        };

        // Only include insideCover if it's being changed (not already true in database)
        if (
          !existingInsideCover ||
          isInsideCoverEnabled !== existingInsideCover
        ) {
          updateTicketData.insideCover = isInsideCoverEnabled;
        }

        // Include customPrintCost if it has a value
        if (customPrintCostValue !== undefined) {
          updateTicketData.customPrintCost = customPrintCostValue;
        }

        // Collect author print prices from form
        const authorPrintPrices: Array<{
          authorId: number;
          authorPrintPrice?: number | null;
        }> = [];
        if (this.tempForm.controls.titleDetails.controls.authorIds) {
          this.tempForm.controls.titleDetails.controls.authorIds.controls.forEach(
            (authorControl) => {
              const authorId = authorControl.controls.id.value;
              const authorPrintPrice =
                authorControl.controls.authorPrintPrice.value;
              if (authorId) {
                authorPrintPrices.push({
                  authorId,
                  authorPrintPrice:
                    authorPrintPrice !== null &&
                    authorPrintPrice !== undefined &&
                    !isNaN(Number(authorPrintPrice))
                      ? Number(authorPrintPrice)
                      : null,
                });
              }
            }
          );
        }

        // Include author print prices if any
        if (authorPrintPrices.length > 0) {
          updateTicketData.authorPrintPrices = authorPrintPrices;
        }

        // Create printing update ticket
        await this.titleService.createTitlePrintingUpdateTicket(
          this.titleId,
          updateTicketData
        );

        // Preserve current pricing values before reloading
        const currentPricingValues =
          this.tempForm.controls.pricing.controls.map((control) => ({
            id: control.controls.id.value,
            platform: control.controls.platform.value,
            mrp: control.controls.mrp.value,
            salesPrice: control.controls.salesPrice.value,
          }));

        // Preserve inside cover media state before reloading
        const currentInsideCoverMedia = insideCoverMedia
          ? {
              id: insideCoverMedia.controls.id.value,
              url: insideCoverMedia.controls.url.value,
              name: insideCoverMedia.controls.name.value,
              file: insideCoverMedia.controls.file.value,
              noOfPages: insideCoverMedia.controls.noOfPages.value,
              size: insideCoverMedia.controls.size.value,
            }
          : null;

        // Show success message
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        // Reset form to prefill with actual details
        try {
          const response = await this.titleService.getTitleById(this.titleId);
          if (response) {
            this.titleDetails.set(response);
            this.prefillFormData(response);

            // Update all media controls with data from response
            if (response.media && Array.isArray(response.media)) {
              response.media.forEach((mediaItem) => {
                const mediaControl =
                  this.tempForm.controls.documentMedia.controls.find(
                    ({ controls: { type } }) => type.value === mediaItem.type
                  );

                if (mediaControl) {
                  // Update existing control with response data
                  mediaControl.patchValue({
                    id: mediaItem.id || mediaControl.controls.id.value,
                    url: mediaItem.url || mediaControl.controls.url.value,
                    name: mediaItem.name || mediaControl.controls.name.value,
                    noOfPages:
                      mediaItem.noOfPages ||
                      mediaControl.controls.noOfPages.value,
                  });
                }
              });
            }

            // Ensure inside cover media control exists if insideCover is enabled
            const isInsideCoverEnabledAfterReload =
              this.tempForm.controls.printing.controls.insideCover.value;
            if (isInsideCoverEnabledAfterReload) {
              let insideCoverMediaControl =
                this.tempForm.controls.documentMedia.controls.find(
                  ({ controls: { type } }) =>
                    type.value === TitleMediaType.INSIDE_COVER
                );

              // If inside cover media control doesn't exist, create it
              if (!insideCoverMediaControl) {
                const insideCoverMediaFromResponse = response.media?.find(
                  ({ type }) => type === TitleMediaType.INSIDE_COVER
                );
                insideCoverMediaControl = await this.createMedia(
                  TitleMediaType.INSIDE_COVER,
                  true,
                  insideCoverMediaFromResponse
                );
                this.tempForm.controls.documentMedia.push(
                  insideCoverMediaControl
                );
              } else {
                // Update existing control with response data if available
                const insideCoverMediaFromResponse = response.media?.find(
                  ({ type }) => type === TitleMediaType.INSIDE_COVER
                );
                if (insideCoverMediaFromResponse) {
                  insideCoverMediaControl.patchValue({
                    id:
                      insideCoverMediaFromResponse.id ||
                      insideCoverMediaControl.controls.id.value,
                    url:
                      insideCoverMediaFromResponse.url ||
                      insideCoverMediaControl.controls.url.value,
                    name:
                      insideCoverMediaFromResponse.name ||
                      insideCoverMediaControl.controls.name.value,
                    noOfPages:
                      insideCoverMediaFromResponse.noOfPages ||
                      insideCoverMediaControl.controls.noOfPages.value,
                  });
                }
              }

              // Restore inside cover media values if they existed before reloading (preserve user input)
              if (currentInsideCoverMedia && insideCoverMediaControl) {
                insideCoverMediaControl.patchValue({
                  id:
                    currentInsideCoverMedia.id ||
                    insideCoverMediaControl.controls.id.value,
                  url:
                    currentInsideCoverMedia.url ||
                    insideCoverMediaControl.controls.url.value,
                  name:
                    currentInsideCoverMedia.name ||
                    insideCoverMediaControl.controls.name.value,
                  file:
                    currentInsideCoverMedia.file ||
                    insideCoverMediaControl.controls.file.value,
                  noOfPages:
                    currentInsideCoverMedia.noOfPages ||
                    insideCoverMediaControl.controls.noOfPages.value,
                  size:
                    currentInsideCoverMedia.size ||
                    insideCoverMediaControl.controls.size.value,
                });
              }
            }

            // Restore pricing values after reloading to prevent them from being cleared
            if (currentPricingValues.length > 0) {
              currentPricingValues.forEach((pricingValue) => {
                const pricingControl =
                  this.tempForm.controls.pricing.controls.find(
                    (control) =>
                      control.controls.platform.value === pricingValue.platform
                  );
                if (
                  pricingControl &&
                  (pricingValue.mrp || pricingValue.salesPrice)
                ) {
                  // Set isSameAsMrp to false if values differ, true if they're the same
                  const isSameAsMrp =
                    pricingValue.mrp === pricingValue.salesPrice;

                  pricingControl.patchValue({
                    id: pricingValue.id,
                    platform: pricingValue.platform,
                    mrp: pricingValue.mrp,
                    salesPrice: pricingValue.salesPrice,
                    isSameAsMrp,
                  });
                }
              });
            }
          }
        } catch (reloadError) {
          console.error('Error reloading title:', reloadError);
        }

        return; // Don't proceed with normal flow
      }

      // Collect author print prices from form
      const authorPrintPrices: Array<{
        authorId: number;
        authorPrintPrice?: number | null;
      }> = [];
      if (this.tempForm.controls.titleDetails.controls.authorIds) {
        this.tempForm.controls.titleDetails.controls.authorIds.controls.forEach(
          (authorControl) => {
            const authorId = authorControl.controls.id.value;
            const authorPrintPrice =
              authorControl.controls.authorPrintPrice.value;
            if (authorId) {
              authorPrintPrices.push({
                authorId,
                authorPrintPrice:
                  authorPrintPrice !== null &&
                  authorPrintPrice !== undefined &&
                  !isNaN(Number(authorPrintPrice))
                    ? Number(authorPrintPrice)
                    : null,
              });
            }
          }
        );
      }

      // Normal update flow
      // For normal update, always include insideCover (required by interface)
      // But only include it if it's being changed
      const createPrinting: PrintingCreate = {
        ...basePrintingData,
        // Only include insideCover if it's being changed (not already true in database)
        insideCover:
          !existingInsideCover || isInsideCoverEnabled !== existingInsideCover
            ? isInsideCoverEnabled
            : existingInsideCover || false,
        // Include customPrintCost if it has a value
        ...(customPrintCostValue !== undefined && {
          customPrintCost: customPrintCostValue,
        }),
        // Include author print prices if any
        ...(authorPrintPrices.length > 0 && {
          authorPrintPrices,
        }),
      };

      const response = await this.titleService.createOrUpdatePrinting(
        createPrinting
      );

      if (response?.id) {
        printing.controls.id.patchValue(response.id);
      }

      await this.calculatePrintingCost();

      if (this.tempForm.controls.printingFormat.value === 'printOnly') {
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('titlesentforapproval') ||
            'Title has been sent for approval to the admin.',
        }).then(() => {
          this.router.navigate(['/titles']);
        });

        return;
      }

      // Move to next step after successful submission
      this.goToNextStep();
    } catch (error) {
      console.error('Error saving printing draft:', error);
      this.errorMessage.set(
        this.translateService.instant('errorsavingprinting') ||
          'Failed to save printing details. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveRoyalties() {
    const royaltiesControl = this.tempForm.controls.royalties;

    if (!royaltiesControl.valid) {
      return;
    }

    if (!this.titleId || this.titleId <= 0) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('titleidrequired') ||
          'Title ID is required.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const royalties: UpdateRoyalty[] = royaltiesControl.controls
        .filter(
          ({ controls: { percentage, platform } }) =>
            percentage.value !== null &&
            percentage.value !== undefined &&
            !isNaN(Number(percentage.value)) &&
            platform.value
        )
        .map(
          ({
            controls: {
              id: { value: id },
              authorId: { value: authorId },
              name: { value: name },
              percentage: { value: percentage },
              publisherId: { value: publisherId },
              platform: { value: platform },
            },
          }) => {
            // Get platform name from form control (it's stored as string)
            const platformName = platform as string;
            if (!platformName) {
              return null; // Skip if no platform
            }

            // Get platform by name to get platformId
            const platformObj =
              this.platformService.getPlatformByName(platformName);
            if (!platformObj) {
              console.error(`Platform '${platformName}' not found`);
              return null; // Skip if platform not found
            }

            return {
              id: id ?? undefined,
              authorId: authorId ?? undefined,
              platformId: platformObj.id,
              percentage: Number(percentage),
              name: name || '',
              publisherId: publisherId ?? undefined,
            } as UpdateRoyalty;
          }
        )
        .filter((royalty): royalty is UpdateRoyalty => royalty !== null);

      if (!royalties.length) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning'),
          text:
            this.translateService.instant('invalidroyaltiesdata') ||
            'Please provide valid royalties data.',
        });
        return;
      }

      // Check if raising ticket for approved title
      if (this.isRaisingTicket()) {
        // Create royalty update ticket
        await this.titleService.createRoyaltyUpdateTicket(this.titleId, {
          royalties,
        });

        // Show success message
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        // Reset form to prefill with actual details
        try {
          const response = await this.titleService.getTitleById(this.titleId);
          if (response) {
            this.titleDetails.set(response);
            this.prefillFormData(response);
          }
        } catch (reloadError) {
          console.error('Error reloading title:', reloadError);
        }

        return; // Don't proceed with normal flow
      }

      // Normal update flow
      await this.titleService.createManyRoyalties(royalties, this.titleId);

      // Move to next step after successful submission
      this.goToNextStep();
    } catch (error) {
      console.error('Error saving royalties:', error);
      this.errorMessage.set(
        this.translateService.instant('errorsavingroyalties') ||
          'Failed to save royalties. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  getCurrentUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  }

  async onClickPurchasePoint(type: DistributionType) {
    try {
      const publisherId =
        Number(
          this.tempForm.controls.titleDetails.controls.publisher.controls.id
            .value
        ) || undefined;
      const res = await this.publisherService.buyPublishingPoints(
        type,
        1,
        `title/${this.titleId}?step=distribution`,
        publisherId
      );
      if (res.status === 'pending' && res.url) {
        window.open(res.url, '_blank');
      }

      if (res.status === 'success') {
        this.fetchAndUpdatePublishingPoints();
      }
    } catch (error) {
      // Error handled silently
    }
  }

  async onDistributionSubmit() {
    if (!this.tempForm.controls.distribution.valid) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning'),
        text:
          this.translateService.instant('invaliddata') ||
          'Please check your form fields before submitting.',
      });
      return;
    }

    if (!this.titleId || this.titleId <= 0) {
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text:
          this.translateService.instant('titleidrequired') ||
          'Title ID is required.',
      });
      return;
    }

    // Get selected distributions and remove already existing ones
    const existingTypes =
      this.titleDetails()?.distribution?.map((d) => d.type) ?? [];
    const distributionsToCreate =
      this.tempForm.controls.distribution.value
        ?.filter(
          ({ isSelected, type }) =>
            isSelected && type && !existingTypes.includes(type)
        )
        .map(({ type }) => type as DistributionType)
        .filter((type): type is DistributionType => !!type) ?? [];

    if (
      distributionsToCreate.length === 0 &&
      !this.titleDetails()?.distribution?.length
    ) {
      Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('warning'),
        text:
          this.translateService.instant('nodistributionselected') ||
          'Please select at least one new distribution type before proceeding.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      // Check if raising ticket for approved title
      if (this.isRaisingTicket()) {
        // Create distribution update ticket
        await this.titleService.createTitleDistributionUpdateTicket(
          this.titleId,
          distributionsToCreate
        );

        // Show success message
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text:
            this.translateService.instant('updateticketrequestsent') ||
            'Request has been sent to superadmin for approval.',
        });

        // Reset form to prefill with actual details
        try {
          const response = await this.titleService.getTitleById(this.titleId);
          if (response) {
            this.titleDetails.set(response);
            this.prefillFormData(response);
          }
        } catch (reloadError) {
          console.error('Error reloading title:', reloadError);
        }

        return; // Don't proceed with normal flow
      }

      if (distributionsToCreate.length > 0) {
        await this.titleService.createTitleDistribution(
          this.titleId,
          distributionsToCreate
        );
      }

      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('success'),
        text:
          this.translateService.instant('titlesentforapproval') ||
          'Title has been sent for approval to the admin.',
      }).then(() => {
        this.router.navigate(['/titles']);
      });
    } catch (error) {
      console.error('Error submitting distribution:', error);
      this.errorMessage.set(
        this.translateService.instant('errorsubmittingdistribution') ||
          'Failed to submit distribution. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
