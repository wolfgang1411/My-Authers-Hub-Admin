import {
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
import { TempTitleDistribution } from './temp-title-distribution/temp-title-distribution';
import Swal from 'sweetalert2';
import { getFileSizeFromS3Url, getFileToBase64 } from '../../common/utils/file';
import { TranslateService } from '@ngx-translate/core';
import { StaticValuesService } from '../../services/static-values';
import { Back } from '../../components/back/back';
import { UserService } from '../../services/user';

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
    TempPricing,
    TempRoyalties,
    TempTitleDistribution,
    Back,
  ],
  templateUrl: './title-form-temp.html',
  styleUrl: './title-form-temp.css',
})
export class TitleFormTemp implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private printingService: PrintingService,
    private titleService: TitleService,
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService,
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
      const publisher = this.publisherSignal();
      const authors = this.authorsSignal();

      this.mapRoyaltiesArray(publisher, authors);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  @ViewChild('scrollTarget') scrollTarget!: ElementRef;

  onSelectDocumentsReady() {
    this.tempForm.get('hasFiles')?.setValue(true);

    // Safe null check before accessing nativeElement
    setTimeout(() => {
      if (this.scrollTarget?.nativeElement) {
        this.scrollTarget.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 200);
  }
  private readonly baseOrder = [
    'details',
    'documents',
    'print',
    'pricing',
    'royalty',
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

    const currentIndex = stepperInstance.selectedIndex;
    const totalSteps = stepperInstance.steps.length;

    // Check if we can move to next step
    if (currentIndex >= totalSteps - 1) {
      return;
    }

    // Use setTimeout to ensure stepper is ready and form state is updated
    setTimeout(() => {
      try {
        // Ensure current step is marked as completed if it has a stepControl
        if (currentIndex >= 0 && currentIndex < stepperInstance.steps.length) {
          const currentStep = stepperInstance.steps.toArray()[currentIndex];
          if (currentStep?.stepControl) {
            // Mark as touched and ensure it's valid
            currentStep.stepControl.markAllAsTouched();
            // If still invalid, mark as completed anyway since we've saved
            if (!currentStep.stepControl.valid) {
              // Force the step to be completed by directly setting selectedIndex
              const nextIndex = currentIndex + 1;
              stepperInstance.selectedIndex = nextIndex;
              const newStepName = this.getStepNameFromIndex(nextIndex);
              if (newStepName) {
                this.currentStep.set(newStepName);
                this.updateStepInQueryParams(newStepName);
              }
              return;
            }
          }
        }

        // Move to next step using next() method
        stepperInstance.next();

        // Update step signal and query params after stepper updates
        setTimeout(() => {
          const newIndex = stepperInstance.selectedIndex;
          const newStepName = this.getStepNameFromIndex(newIndex);
          if (newStepName && newIndex !== currentIndex) {
            this.currentStep.set(newStepName);
            this.updateStepInQueryParams(newStepName);
          }
        }, 100);
      } catch (error) {
        console.error('Error moving to next step:', error);
        // Fallback: try direct index set
        const nextIndex = currentIndex + 1;
        if (nextIndex < totalSteps) {
          stepperInstance.selectedIndex = nextIndex;
          const newStepName = this.getStepNameFromIndex(nextIndex);
          if (newStepName) {
            this.currentStep.set(newStepName);
            this.updateStepInQueryParams(newStepName);
          }
        }
      }
    }, 100);
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
      setTimeout(() => {
        stepperInstance.selectedIndex = index;
        this.currentStep.set(step);
        this.updateStepInQueryParams(step);
      }, 200);
    }
  }

  /**
   * Handle stepper selection change and update query params
   */
  private setupStepperStepTracking(): void {
    // Wait for stepper to be available and form to be initialized
    setTimeout(() => {
      const stepperInstance = this.stepper();
      if (!stepperInstance) {
        // Retry if stepper not ready yet
        setTimeout(() => this.setupStepperStepTracking(), 200);
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

            // Calculate MSP when moving to pricing step
            // This ensures MSP is calculated even if it wasn't calculated earlier
            if (stepName === 'pricing') {
              setTimeout(() => {
                // Force calculation when moving to pricing step
                // This handles cases where fields were filled but calculation didn't trigger
                this.calculatePrintingCost();
              }, 200);
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

          // Calculate MSP if navigating to pricing step
          if (queryStep === 'pricing') {
            setTimeout(() => {
              // Force calculation when navigating to pricing from query params
              this.calculatePrintingCost();
            }, 300);
          }
        } else {
          // Invalid step in query params, use current stepper index
          const currentIndex = stepperInstance.selectedIndex;
          const stepName = this.getStepNameFromIndex(currentIndex);
          if (stepName) {
            this.currentStep.set(stepName);
            this.updateStepInQueryParams(stepName);
          }
        }
      } else {
        // No step in query params, set initial step based on current stepper index
        const currentIndex = stepperInstance.selectedIndex;
        const stepName = this.getStepNameFromIndex(currentIndex);
        if (stepName) {
          this.currentStep.set(stepName);
          this.updateStepInQueryParams(stepName);
        }
      }
    }, 400);
  }

  @ViewChildren('fileInput') fileInputs!: QueryList<
    ElementRef<HTMLInputElement>
  >;

  loggedInUser!: Signal<User | null>;
  staticValueService = inject(StaticValuesService);
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

  private stepper = viewChild<MatStepper>('stepperForm');

  onAuthorChangeChild(authorId: number) {
    const author = this.authorsList().find((a) => a.id === authorId);
    if (!author) return;

    const current = this.authorsSignal();
    if (!current.some((a) => a.id === author.id)) {
      this.authorsSignal.set([...current, author]);
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
      default:
        return '';
    }
  }

  getAcceptedTypes(mediaType: TitleMediaType | undefined): string {
    if (mediaType === 'INTERIOR' || mediaType === 'FULL_COVER')
      return 'application/pdf';
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
    this.addDefaultMediaArray(media);
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

    manageISBNRequired(this.tempForm.controls.publishingType.value);
    this.tempForm.controls.publishingType.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        manageISBNRequired(v);
      });

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

    // Early exit if required data is missing
    if (
      !publisher ||
      !Array.isArray(authors) ||
      !authors.length ||
      !printing?.valid ||
      !pricing?.valid ||
      !pricing.length
    ) {
      return;
    }

    const publisherId = publisher.id;
    const authorIds = authors.map((a) => a.id);

    const platforms =
      (Object.keys(
        this.staticValueService.staticValues()?.PlatForm || {}
      ) as PlatForm[]) || [];

    if (!platforms.length) {
      return; // No platforms available
    }

    // 🧹 STEP 1: Remove royalties not related to current publisher or authors
    for (let i = royalties.length - 1; i >= 0; i--) {
      const control = royalties.at(i);
      const { publisherId: pid, authorId: aid } = control.value;

      const isValid = pid === publisherId || (aid && authorIds.includes(aid));

      if (!isValid) royalties.removeAt(i);
    }

    // 🧱 STEP 2: Ensure publisher royalties per platform
    for (const platform of platforms) {
      let control = royalties.controls.find(
        ({ value }) =>
          value.publisherId === publisherId && value.platform === platform
      );

      console.log({ control });

      if (!control) {
        // ✅ Create new if missing
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
        });

        royalties.push(control);
      } else {
        // ✅ Keep existing values
        const existingValue = control.value;

        control.patchValue({
          publisherId,
          titleId: this.titleId,
          name:
            publisher.name ||
            `${publisher.user?.firstName || ''} ${
              publisher.user?.lastName || ''
            }`.trim() ||
            'Unknown Publisher',
          platform,
          percentage: existingValue.percentage,
        });
      }
    }

    // 👥 STEP 3: Ensure author royalties per platform
    for (const author of authors) {
      const { id: authorId, name, user } = author;

      for (const platform of platforms) {
        let control = royalties.controls.find(
          ({ value }) =>
            value.authorId === authorId && value.platform === platform
        );

        if (!control) {
          // ✅ Create new if missing
          control = this.createRoyaltyGroup({
            authorId,
            titleId: this.titleId,
            name:
              name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            platform,
          });
          royalties.push(control);
        } else {
          // ✅ Preserve existing values
          const existingValue = control.value;
          control.patchValue({
            authorId,
            titleId: this.titleId,
            name:
              name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            platform,
            ...existingValue,
          });
        }
      }
    }
  }

  createRoyaltyGroup(data?: UpdateRoyalty) {
    return new FormGroup<RoyaltyFormGroup>({
      id: new FormControl<number | null>(data?.id || null),
      name: new FormControl<string | null>(data?.name || null),
      authorId: new FormControl<number | null>(data?.authorId || null),
      publisherId: new FormControl<number | null>(data?.publisherId || null),
      percentage: new FormControl(data?.percentage || null, [
        Validators.required,
      ]),
      platform: new FormControl(data?.platform || null),
      titleId: new FormControl<number>(this.titleId),
    });
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

      const mspController = this.tempForm.controls.printing.controls.msp;
      const response = await this.printingService.getPrintingPrice(payload);

      if (response?.printPerItem && typeof response.printPerItem === 'number') {
        // Use emitEvent: false to prevent triggering valueChanges and causing infinite loop
        mspController?.patchValue(response.printPerItem, { emitEvent: false });
      }
    } catch (error) {
      console.error('Error calculating printing cost:', error);
      // Don't show error to user as this is called frequently during form changes
    }
  }

  prefillFormData(data: Title): void {
    const isEbookISBNAutoGenerated = data.isbnEbook
      ?.toLowerCase()
      ?.startsWith('bclb');
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
        isbnPrint: data.isbnPrint || null,
        isbnEbook: data.isbnEbook || null,
        isEbookIsbnAutoGenerated: isEbookISBNAutoGenerated,
      },

      printing: {
        id: data.printing?.[0]?.id,
        bookBindingsId: data.printing?.[0]?.bindingType.id,
        totalPages: data.printing?.[0]?.totalPages || 0,
        colorPages: data.printing?.[0]?.colorPages || 0,
        isColorPagesRandom: data.printing?.[0]?.isColorPagesRandom,
        bwPages: data.printing?.[0]?.bwPages,
        insideCover: data.printing?.[0]?.insideCover,
        laminationTypeId: data.printing?.[0]?.laminationType.id,
        paperType: data.printing?.[0]?.paperType,
        paperQuailtyId: data.printing?.[0]?.paperQuailty.id,
        sizeCategoryId: data.printing?.[0]?.sizeCategory.id,
        msp: data.printing?.[0]?.printCost,
      },
    });
    if (isEbookISBNAutoGenerated) {
      this.tempForm.controls.titleDetails.controls.isbnEbook.disable();
    }
    this.tempForm.controls.titleDetails.controls.authorIds.clear();
    this.authorsSignal.set(data.authors?.map(({ author }) => author) || []);
    this.publisherSignal.set(data.publisher);

    data.authors?.forEach(({ author, display_name }) => {
      this.tempForm.controls.titleDetails.controls.authorIds.push(
        new FormGroup<AuthorFormGroup>({
          id: new FormControl<number | null>(author.id),
          name: new FormControl<string>(author.name),
          keepSame: new FormControl<boolean>(author.name === display_name),
          displayName: new FormControl<string>(display_name),
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
      // Auto-calculate black and white pages and MSP after a small delay to ensure form state is updated
      setTimeout(() => {
        this.calculateBlackAndWhitePages();
        // Recalculate printing cost (MSP) when totalPages changes
        // This will calculate if all required fields are available
        this.calculatePrintingCost();
      }, 100);
    }

    data.royalties?.forEach((d) => {
      const { authorId: aId, publisherId: pId } = d;
      const controlExist = this.tempForm.controls.royalties.controls.find(
        ({ controls: { authorId, publisherId, platform } }) =>
          (aId && aId === authorId.value && platform.value === d.platform) ||
          (pId && pId === publisherId.value && platform.value === d.platform)
      );

      console.log({ d, controlExist });

      if (controlExist) {
        controlExist.patchValue({
          percentage: d.percentage,
        });
      } else {
        this.tempForm.controls.royalties.push(
          this.createRoyaltyGroup({
            platform: d.platform,
            percentage: d.percentage,
            publisherId: pId,
            authorId: aId,
            titleId: this.titleId,
          })
        );
      }
    });

    data.distribution?.forEach(({ id, type }) => {
      const disTypeControl = this.tempForm.controls.distribution.controls.find(
        ({ controls }) => controls.type.value === type
      );
      if (disTypeControl) {
        disTypeControl.controls.isSelected.patchValue(true);
        disTypeControl.controls.id.patchValue(id);
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

      return wordCount < minWords
        ? { minWords: { required: minWords, actual: wordCount } }
        : null;
    };
  }

  updatePricingArray(pricing?: TitlePricing[]) {
    pricing?.forEach(({ platform, id, mrp, salesPrice }) => {
      const pricingControl = this.tempForm.controls['pricing'].controls?.filter(
        ({ controls }) => controls.platform.value === platform
      )[0];

      if (pricingControl) {
        pricingControl.patchValue({
          id,
          platform,
          mrp,
          salesPrice,
        });
      }
    });
  }

  mrpValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null; // parent not ready yet
      }

      const msp = Number(this.tempForm.controls.printing.controls.msp?.value);
      const mrp = Number(control.value);

      return msp !== null && mrp < msp
        ? { invalid: 'MRP cannot be lower than MSP' }
        : null;
    };
  }

  salesPriceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null; // parent not ready yet
      }

      const msp = Number(this.tempForm.controls.printing.controls.msp?.value);
      const mrp = control.parent.get('mrp')?.value;
      const salesPrice = control.value;

      if (salesPrice < msp) {
        return {
          invalid: 'Sales price cannot be lower then MSP',
        };
      }
      if (salesPrice > mrp) {
        return {
          invalid: 'Sales price cannot be higher then MRP',
        };
      }
      return null;
    };
  }

  distributionValidator(): ValidatorFn {
    return (control) => {
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

      const national = distributions.find(
        ({ type, isSelected }) =>
          type === DistributionType.National && isSelected
      );
      const hardboundNational = distributions.find(
        ({ type, isSelected }) =>
          type === DistributionType.Hardbound_National && isSelected
      );

      if (!national && !hardboundNational) {
        return {
          invalid: 'Either choose national or hardbound national atlest.',
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
    return new FormArray<FormGroup<TitleDistributionGroup>>(
      Object.keys(DistributionType).map(
        (type) =>
          new FormGroup<TitleDistributionGroup>({
            id: new FormControl<number | null>(null),
            isSelected: new FormControl(false, { nonNullable: true }),
            name: new FormControl(type, { nonNullable: true }),
            type: new FormControl(type as DistributionType, {
              nonNullable: true,
            }),
            availablePoints: new FormControl(0, { nonNullable: true }),
          })
      ),
      { validators: [this.distributionValidator()] }
    );
  }

  createPricingArrayTemp(): FormArray<PricingGroup> {
    return new FormArray(
      Object.keys(this.staticValueService.staticValues()?.PlatForm || {}).map(
        (platform) =>
          new FormGroup({
            id: new FormControl<number | null | undefined>(null),
            platform: new FormControl<string>(platform, Validators.required),
            salesPrice: new FormControl<number | null | undefined>(
              null,
              Validators.required
            ),
            mrp: new FormControl<number | null | undefined>(null, [
              Validators.required,
              this.mrpValidator() as ValidatorFn,
            ]),
          }) as PricingGroup
      )
    );
  }

  createTitleDetailsGroup(): FormGroup<TitleDetailsFormGroup> {
    return new FormGroup<TitleDetailsFormGroup>({
      name: new FormControl<string>('', Validators.required),
      subTitle: new FormControl<string>(''),
      longDescription: new FormControl<string>('', [
        Validators.required,
        this.minWordsValidator(20),
      ]),
      shortDescription: new FormControl<string>('', Validators.required),
      edition: new FormControl<number | null>(null),
      language: new FormControl<string>(''),
      subject: new FormControl<string>('', [
        Validators.required,
        this.minWordsValidator(5),
        Validators.maxLength(50),
      ]),
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
        }),
      ]),
      isbnPrint: new FormControl<string | null>(null, {
        validators: [Validators.pattern(/^(97(8|9))?\d{9}(\d|X)$/)],
      }),
      isbnEbook: new FormControl<string | null>(null, {
        validators: [Validators.pattern(/^(97(8|9))?\d{9}(\d|X)$/)],
      }),
      isEbookIsbnAutoGenerated: new FormControl(false),
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
      isColorPagesRandom: new FormControl<boolean>(false, {
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
    });
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
    ])
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.calculatePrintingCost();
      });
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

  async onTitleSubmit() {
    if (!this.tempForm.controls.titleDetails.valid) {
      return;
    }

    const titleDetails = this.tempForm.controls.titleDetails?.value;
    const validAuthors = (titleDetails.authorIds || [])
      .filter((author: any) => !!author?.id)
      .map((author: any) => ({
        id: author.id,
        displayName: author.displayName || '',
      }));
    const basicData: TitleCreate = {
      publishingType: this.tempForm.controls.publishingType
        .value as PublishingType,
      isbnPrint: titleDetails?.isbnPrint ?? undefined,
      isbnEbook:
        this.tempForm.controls.titleDetails.controls.isbnEbook.value ??
        undefined,
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
      ...(validAuthors.length > 0 && { authorIds: validAuthors }),
      id: this.titleId,
    } as TitleCreate;
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
          basicData
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
          // Continue even if reload fails
        }

        return; // Don't proceed with normal update flow
      }

      // Normal create/update flow for non-approved titles or non-publishers
      const res: { id: number } = await this.titleService.createTitle(
        basicData
      );

      if (!res?.id || isNaN(Number(res.id))) {
        throw new Error('Invalid response from server');
      }

      this.titleId = Number(res.id);
      this.isNewTitle = false;

      // Update URL to include the title ID to prevent creating new title on refresh
      // When titleId changes, format step disappears, so adjust step if needed
      const currentStepName = this.currentStep();
      let targetStep = currentStepName || 'details';

      // If we were on format step, move to details
      if (currentStepName === 'format') {
        targetStep = 'details';
      }

      // Update URL with titleId and current step
      this.router.navigate(['/title', this.titleId], {
        replaceUrl: true,
        queryParams: {
          ...this.route.snapshot.queryParams,
          step: targetStep,
        },
      });

      // Move to next step after URL update completes
      setTimeout(() => {
        this.goToNextStep();
      }, 150);
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
            // Auto-calculate black and white pages and MSP after a small delay to ensure form state is updated
            setTimeout(() => {
              this.calculateBlackAndWhitePages();
              // Recalculate printing cost (MSP) when totalPages changes
              // This will calculate if all required fields are available
              this.calculatePrintingCost();
            }, 100);
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
          // Auto-calculate black and white pages and MSP after a small delay to ensure form state is updated
          setTimeout(() => {
            this.calculateBlackAndWhitePages();
            // Recalculate printing cost (MSP) when totalPages changes
            // This will calculate if all required fields are available
            this.calculatePrintingCost();
          }, 100);
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

    if (!pricingControls.valid) {
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

      const data: PricingCreate[] = pricingControls.controls
        .filter(
          ({ controls: { platform, mrp, salesPrice } }) =>
            platform.value &&
            mrp.value &&
            salesPrice.value &&
            !isNaN(Number(mrp.value)) &&
            !isNaN(Number(salesPrice.value))
        )
        .map(({ controls: { platform, id, mrp, salesPrice } }) => ({
          id: id.value || undefined,
          platform: platform.value as string,
          mrp: Number(mrp.value),
          salesPrice: Number(salesPrice.value),
          titleId: Number(this.titleId),
        }));

      if (!data.length) {
        Swal.fire({
          icon: 'warning',
          title: this.translateService.instant('warning'),
          text:
            this.translateService.instant('invalidpricingdata') ||
            'Please provide valid pricing data.',
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

      const publisher = this.publisherSignal();
      const authors = this.authorsSignal();

      if (publisher) {
        this.mapRoyaltiesArray(publisher, authors);
      }

      // Move to next step after successful submission
      this.goToNextStep();
    } catch (error) {
      console.error('Error saving pricing:', error);
      this.errorMessage.set(
        this.translateService.instant('errorsavingpricing') ||
          'Failed to save pricing. Please try again.'
      );
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

      // Build printing data
      // Only include insideCover if it's being changed (not already true in database)
      const basePrintingData = {
        id: printingDetails.id || undefined,
        titleId: Number(this.titleId),
        bindingTypeId: Number(printingDetails.bookBindingsId),
        totalPages: printing.controls.totalPages.value || 0,
        colorPages: Number(printingDetails.colorPages) || 0,
        laminationTypeId: Number(printingDetails.laminationTypeId),
        paperType: (printingDetails.paperType as PaperType) || 'WHITE',
        paperQuailtyId: Number(printingDetails.paperQuailtyId),
        sizeCategoryId: Number(printingDetails.sizeCategoryId),
        customPrintCost: 0,
        isColorPagesRandom: printingDetails.isColorPagesRandom || false,
      };

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
                  pricingControl.patchValue({
                    id: pricingValue.id,
                    platform: pricingValue.platform,
                    mrp: pricingValue.mrp,
                    salesPrice: pricingValue.salesPrice,
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
          }) => ({
            id: id || undefined,
            authorId: authorId || undefined,
            platform: platform as PlatForm,
            percentage: Number(percentage),
            name: name || '',
            publisherId: publisherId || undefined,
            titleId: this.titleId,
          })
        );

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
      console.log(error);
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
        // Normal update flow - only create new distributions
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
