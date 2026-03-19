import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { StepperOrientation } from '@angular/cdk/stepper';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Subject,
  takeUntil,
  Observable,
  debounceTime,
  startWith,
  map,
  firstValueFrom,
} from 'rxjs';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user';
import { TitleService } from '../titles/title-service';
import { StaticValuesService } from '../../services/static-values';
import { PlatformService } from '../../services/platform';
import { PrintingService } from '../../services/printing-service';
import { PublisherService } from '../publisher/publisher-service';
import {
  AuthorFormGroup,
  DistributionType,
  PricingGroup,
  PrintingFormGroup,
  PublisherFormGroup,
  PublishingType,
  RoyaltyFormGroup,
  TitleDetailsFormGroup,
  TitleDistributionGroup,
  TitleMedia,
  TitleMediaGroup,
  TitleStatus,
  UpdateRoyalty,
  PlatForm,
  Title,
  TitleMediaType,
  BookBindings,
} from '../../interfaces';

import { AddTitleFormat } from './sub-components/add-title-format/add-title-format';
import { AddTitleDetails } from './sub-components/add-title-details/add-title-details';
import { AddTitleMedia } from './sub-components/add-title-media/add-title-media';
import { AddTitlePrinting } from './sub-components/add-title-printing/add-title-printing';
import { AddTitlePricingRoyalty } from './sub-components/add-title-pricing-royalty/add-title-pricing-royalty';
import { AddTitleDistribution } from './sub-components/add-title-distribution/add-title-distribution';
import { format } from 'date-fns';
import { getFileSizeFromS3Url } from '../../common/utils/file';
import { ValidatorFn, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-add-title',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    RouterModule,
    AddTitleFormat,
    AddTitleDetails,
    AddTitleMedia,
    AddTitlePrinting,
    AddTitlePricingRoyalty,
    AddTitleDistribution,
  ],
  templateUrl: './add-title.html',
  styleUrl: './add-title.css',
})
export class AddTitle implements OnInit, OnDestroy {
  constructor(private readonly route: ActivatedRoute) {
    route.params.pipe(takeUntil(this.destroy$)).subscribe(({ titleId }) => {
      const parsedId = Number(titleId);
      this.titleId.set(isNaN(parsedId) || parsedId <= 0 ? 0 : parsedId);
    });
  }

  private readonly destroy$ = new Subject<void>();
  private readonly titleService = inject(TitleService);

  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  private readonly staticValuesService = inject(StaticValuesService);
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly fb = inject(FormBuilder);
  private readonly platformService = inject(PlatformService);
  private readonly printingService = inject(PrintingService);
  private readonly publisherService = inject(PublisherService);

  // Stepper orientation signal-like observable
  stepperOrientation: Observable<StepperOrientation> = this.breakpointObserver
    .observe('(min-width: 800px)')
    .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));

  // State Signals
  isLoading = signal(false);
  titleId = signal<number>(0);
  isNewTitle = computed(() => Number(this.titleId()) === 0);
  currentStep = signal<
    'details' | 'documents' | 'print' | 'pricing' | 'distribution'
  >('details');
  loggedInUser = this.userService.loggedInUser$;

  title = signal<Title | null>(null);

  // Hardbound Allowed State
  private isHardBoundAllowedSignal = signal<boolean>(false);
  isHardBoundAllowed = computed(() => this.isHardBoundAllowedSignal());
  bindingType: BookBindings[] = [];

  // The main form group - mirroring the structure of title-form-temp
  addTitleForm = new FormGroup({
    printingFormat: new FormControl<string | null>(null, Validators.required),
    hasFiles: new FormControl<boolean | null>(null, Validators.required),
    publishingType: new FormControl<PublishingType | null>(
      null,
      Validators.required,
    ),
    titleDetails: this.createTitleDetailsGroup(),
    printing: this.createPrintingGroupTemp(),
    pricing: this.createPricingArrayTemp(),
    distribution: this.createDistributionOptions(),
    documentMedia: new FormArray<FormGroup<TitleMediaGroup>>([]),
    authorRoyalties: new FormArray<
      FormGroup<{
        authorId: FormControl<number | null>;
        percentage: FormControl<number | null>;
      }>
    >([]),
  });

  detailsGroup = this.addTitleForm.controls.titleDetails;

  // // Form Group Accessors for template and sub-components
  // get detailsGroup() {
  //   return this.addTitleForm.controls
  //     .titleDetails as FormGroup<TitleDetailsFormGroup>;
  // }
  documentMediaArray = signal(
    this.addTitleForm.controls.documentMedia as FormArray<
      FormGroup<TitleMediaGroup>
    >,
  );
  printingGroup = signal(this.addTitleForm.controls.printing);
  pricingGroupControls = this.addTitleForm.controls.pricing;
  authorRoyaltiesController = this.addTitleForm.controls.authorRoyalties;
  distributionGroupControls = this.addTitleForm.controls.distribution;

  private stepper = viewChild<MatStepper>('stepperForm');
  // Re-map relevant types to local component for template access
  PublishingType = PublishingType;

  async ngOnInit() {
    const { items: bindingTypes } = await this.printingService.getBindingType();
    this.bindingType = bindingTypes;

    if (this.titleId()) {
      await this.fetchAndUpdateTitle();
    } else {
      await this.initMediaArray();
    }

    // Listen for publisher changes to fetch points
    this.detailsGroup.controls.publisher.controls.id.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchAndUpdatePublishingPoints();
      });

    // Listen to binding changes to update isHardBoundAllowed
    this.printingGroup()
      .controls.bookBindingsId.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const isHardBound = this.bindingType
          .find(({ id }) => id === value)
          ?.name.toLowerCase()
          .includes('hardbound');

        this.isHardBoundAllowedSignal.set(isHardBound ?? false);

        const hardBoundController =
          this.distributionGroupControls.controls.find(
            ({ controls: { type } }) =>
              type.value === DistributionType.Hardbound_National,
          );

        if (isHardBound) {
          if (!hardBoundController) {
            this.distributionGroupControls.push(
              new FormGroup<TitleDistributionGroup>({
                id: new FormControl<number | null>(null),
                isSelected: new FormControl<boolean>(false, {
                  nonNullable: true,
                }),
                name: new FormControl<string>(
                  DistributionType.Hardbound_National,
                  {
                    nonNullable: true,
                  },
                ),
                type: new FormControl<DistributionType>(
                  DistributionType.Hardbound_National,
                  { nonNullable: true },
                ),
                availablePoints: new FormControl<number>(0, {
                  nonNullable: true,
                }),
              }),
            );
          }
        } else {
          if (hardBoundController) {
            const index =
              this.distributionGroupControls.controls.indexOf(
                hardBoundController,
              );
            if (index !== -1) {
              this.distributionGroupControls.removeAt(index);
            }
          }
        }
      });

    // Binding for manageIsbnRequired
    this.addTitleForm.controls.publishingType.valueChanges
      .pipe(
        startWith(this.addTitleForm.controls.publishingType.value),
        takeUntil(this.destroy$),
      )
      .subscribe((type) => {
        this.manageIsbnRequired(type);
      });

    this.detailsGroup.controls.isEbookIsbnAutoGenerated.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.manageIsbnRequired(
          this.addTitleForm.controls.publishingType.value,
        );
      });

    this.setupMediaListeners();
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async fetchAndUpdateTitle() {
    try {
      const title = await this.titleService.getTitleById(this.titleId());
      if (title) {
        this.title.set(title);
        await this.prefillForm(title);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async fetchAndUpdatePublishingPoints() {
    const publisherId = this.detailsGroup.controls.publisher.value.id;
    if (!publisherId) {
      return;
    }

    try {
      const resp: any =
        await this.publisherService.fetchPublishingPoints(publisherId);
      const items = resp?.items || [];

      this.distributionGroupControls.controls.forEach((group) => {
        const type = group.controls.type.value;
        if (type === DistributionType.MAH) {
          group.controls.availablePoints.setValue(Number.MAX_SAFE_INTEGER, {
            emitEvent: false,
          });
        } else {
          const match = items.find((itm: any) => itm.distributionType === type);
          const pts = match ? match.availablePoints : 0;
          group.controls.availablePoints.setValue(pts, { emitEvent: false });
        }
      });
    } catch (error) {
      console.error('Failed to fetch points', error);
    }
  }

  async prefillForm(title: Partial<Title>) {
    if (title.isbnEbook?.toLocaleLowerCase().startsWith('bcbl')) {
      this.detailsGroup.controls.isEbookIsbnAutoGenerated.setValue(true);
      this.detailsGroup.controls.isbnEbook.disable();
    }

    this.addTitleForm.patchValue({
      hasFiles: true,
      publishingType: title.publishingType,
      printingFormat: title.printingOnly ? 'printOnly' : 'publish&print',
      titleDetails: {
        publisher: {
          id: title.publisher?.id,
          name: title.publisher?.name,
          keepSame: title.publisher?.name === title.publisherDisplay,
          displayName: title.publisherDisplay,
        },
        autoKeywords: title.keywords,
        keywords: title.keywords,
        category: title?.category?.id,
        edition: title?.edition,
        genre: title?.genre?.id,
        isbnEbook: title?.isbnEbook,
        isbnPrint: title?.isbnPrint,
        language: title?.language,
        isEbookIsbnAutoGenerated: title?.isbnEbook
          ?.toLowerCase()
          ?.startsWith('bcbl'),
        launch_date: title?.launch_date
          ? format(new Date(title.launch_date), 'yyyy-MM-dd')
          : null,
        longDescription: title?.longDescription,
        name: title?.name,
        publisherDisplay: title?.publisherDisplay,
        status: title?.status,
        subject: title?.subject,
        subCategory: title?.subCategory?.id,
        subTitle: title?.subTitle,
        tradeCategory: title?.tradeCategory?.id,
      },
    });

    while (
      this.addTitleForm.controls.titleDetails.controls.authorIds.length > 0
    ) {
      this.addTitleForm.controls.titleDetails.controls.authorIds.removeAt(0);
    }

    title.authors?.forEach(({ author, display_name, allowAuthorCopy }) => {
      this.addTitleForm.controls.titleDetails.controls.authorIds.push(
        new FormGroup<AuthorFormGroup>({
          id: new FormControl<number | null>(
            author?.id ?? null,
            Validators.required,
          ),
          name: new FormControl<string>(
            (() => {
              return `${author?.user.firstName || ''} ${author?.user.lastName || ''} (${author?.username})`;
            })(),
          ),
          keepSame: new FormControl<boolean>(true),
          displayName: new FormControl<string>(
            display_name ?? '',
            Validators.required,
          ),
          allowAuthorCopy: new FormControl<boolean | null>(
            allowAuthorCopy ?? false,
          ),
        }),
      );
    });

    // Prefill Printing
    if (title.printing?.[0]) {
      this.printingGroup().patchValue({
        id: title.printing[0]?.id,
        bookBindingsId:
          title.printing[0]?.bindingType?.id ||
          this.printingGroup().value.bookBindingsId,
        colorPages: title.printing[0]?.colorPages || 0,
        bwPages:
          (title.printing[0]?.totalPages || 0) -
          (title.printing[0]?.colorPages || 0),
        insideCover: !!title.printing[0]?.insideCover,
        laminationTypeId: title.printing[0]?.laminationType?.id,
        paperType: title.printing[0]?.paperType,
        paperQuailtyId: title.printing[0]?.paperQuailty?.id,
        sizeCategoryId: title.printing[0]?.size?.id,
        realSizeCategoryId: title.printing[0]?.sizeCategory?.id,
        printingPrice: title.printing[0]?.printCost,
        customPrintCost: title.printing[0]?.customPrintCost,
        isColorPagesRandom: title.printing[0]?.isColorPagesRandom,
      });
    }

    const media = Array.isArray(title?.media) ? title.media : [];
    await this.initMediaArray(media);

    const interiorMedia = title.media?.find(
      ({ type }) => type === TitleMediaType.INTERIOR,
    );
    this.printingGroup().controls.totalPages.patchValue(
      interiorMedia?.noOfPages || 0,
    );

    // Prefill Pricing
    if (title.pricing && title.pricing.length > 0) {
      this.pricingGroupControls.clear();
      title.pricing.forEach((p) => {
        this.pricingGroupControls.push(
          new FormGroup({
            id: new FormControl(p.id),
            platform: new FormControl(p.platform, Validators.required),
            salesPrice: new FormControl(p.salesPrice, [
              Validators.required,
              this.salesPriceValidator(p.platform) as ValidatorFn,
            ]),
            mrp: new FormControl(p.mrp, [
              Validators.required,
              this.mrpValidator(p.platform) as ValidatorFn,
            ]),
            isSameAsMrp: new FormControl(p.salesPrice === p.mrp),
          }) as PricingGroup,
        );
      });
    }

    // Prefill Royalties
    if (title.royalties && title.royalties.length > 0) {
      const authorPercentMap = new Map<number, number>();
      title.royalties.forEach((r: any) => {
        if (r.authorId && !authorPercentMap.has(r.authorId)) {
          authorPercentMap.set(r.authorId, r.percentage);
        }
      });

      this.addTitleForm.controls.authorRoyalties.clear();
      authorPercentMap.forEach((percentage, authorId) => {
        this.addTitleForm.controls.authorRoyalties.push(
          new FormGroup({
            authorId: new FormControl<number | null>(authorId),
            percentage: new FormControl<number | null>(percentage, [
              Validators.required,
              Validators.min(0),
              Validators.max(100),
            ]),
          }),
        );
      });
    }

    // Prefill Distribution
    if (title.distribution && title.distribution.length > 0) {
      this.distributionGroupControls.controls.forEach((control) => {
        const distributionType = control.get('type')?.value;
        const isSelected = (title.distribution as any[])?.some(
          (d) => (d.type || d) === distributionType,
        );

        if (distributionType === DistributionType.MAH) {
          control.get('isSelected')?.setValue(true);
        } else {
          control.get('isSelected')?.setValue(!!isSelected);
        }

        // Find existing distribution id if any
        const existingDist = (title.distribution as any[])?.find(
          (d) => (d.type || d) === distributionType,
        );
        if (existingDist?.id) {
          control.get('id')?.setValue(existingDist.id);
        }
      });
    } else {
      const mahControl = this.distributionGroupControls.controls.find(
        (c) => c.get('type')?.value === DistributionType.MAH,
      );
      if (mahControl) {
        mahControl.get('isSelected')?.setValue(true);
      }
    }

    // Also fetch points on prefill
    await this.fetchAndUpdatePublishingPoints();
  }

  // Media Management Methods
  setupMediaListeners() {
    // Listen to publishingType changes for ISBN validation
    // Use startWith to apply validators based on the initial value
    this.addTitleForm
      .get('publishingType')
      ?.valueChanges.pipe(
        startWith(this.addTitleForm.get('publishingType')?.value),
        takeUntil(this.destroy$),
      )
      .subscribe((val) => {
        this.manageIsbnRequired(val as PublishingType | null);
      });

    this.addTitleForm.controls.publishingType.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (v) => {
        // Handle FULL_COVER visibility
        const fullCoverControl = this.documentMediaArray().controls.find(
          (c) => c.controls.type.value === TitleMediaType.FULL_COVER,
        );

        if (v !== PublishingType.ONLY_EBOOK && !fullCoverControl) {
          // Insert at index 3 (after Interior which is at 2)
          const existingFullCover = this.title()?.media?.find(
            (m) => m.type === TitleMediaType.FULL_COVER,
          );
          this.documentMediaArray().insert(
            3,
            await this.createMedia(
              TitleMediaType.FULL_COVER,
              true,
              existingFullCover,
            ),
          );
        } else if (v === PublishingType.ONLY_EBOOK && fullCoverControl) {
          const index =
            this.documentMediaArray().controls.indexOf(fullCoverControl);
          if (index >= 0) {
            this.documentMediaArray().removeAt(index);
          }
        }

        await this.manageManuscriptMedia(v);

        // Reset distribution options when publishing type changes to handle MAH only logic properly
        this.addTitleForm.setControl(
          'distribution',
          this.createDistributionOptions(),
        );
        this.distributionGroupControls =
          this.addTitleForm.controls.distribution;
        this.fetchAndUpdatePublishingPoints();

        this.cdr.markForCheck();
      });

    this.printingGroup()
      .controls.insideCover.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(async (insideCover) => {
        const insideCoverControl = this.documentMediaArray().controls.find(
          (c) => c.controls.type.value === TitleMediaType.INSIDE_COVER,
        );
        if (insideCover && !insideCoverControl) {
          const existingInsideCover = this.title()?.media?.find(
            (m) => m.type === TitleMediaType.INSIDE_COVER,
          );
          this.documentMediaArray().push(
            await this.createMedia(
              TitleMediaType.INSIDE_COVER,
              true,
              existingInsideCover,
            ),
          );
        } else if (!insideCover && insideCoverControl) {
          const index =
            this.documentMediaArray().controls.indexOf(insideCoverControl);
          if (index >= 0) {
            this.documentMediaArray().removeAt(index);
          }
        }
        this.cdr.markForCheck();
      });

    // Sync totalPages from INTERIOR media
    this.documentMediaArray()
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((medias) => {
        const interior = medias.find((m) => m.type === TitleMediaType.INTERIOR);
        if (interior && interior.noOfPages) {
          const totalPagesControl = this.printingGroup().controls.totalPages;
          if (totalPagesControl.value !== interior.noOfPages) {
            totalPagesControl.setValue(interior.noOfPages, { emitEvent: true });
          }
        }
      });
  }

  async initMediaArray(medias?: TitleMedia[]) {
    // Clear array just in case to prevent duplicates on prefill
    while (this.documentMediaArray().length !== 0) {
      this.documentMediaArray().removeAt(0);
    }

    // 1. FRONT_COVER
    this.documentMediaArray().push(
      await this.createMedia(
        TitleMediaType.FRONT_COVER,
        true,
        medias?.find(({ type }) => type === 'FRONT_COVER'),
      ),
    );
    // 2. BACK_COVER
    this.documentMediaArray().push(
      await this.createMedia(
        TitleMediaType.BACK_COVER,
        false,
        medias?.find(({ type }) => type === 'BACK_COVER'),
      ),
    );
    // 3. INTERIOR
    this.documentMediaArray().push(
      await this.createMedia(
        TitleMediaType.INTERIOR,
        true,
        medias?.find(({ type }) => type === 'INTERIOR'),
      ),
    );

    // 4. FULL_COVER (Conditional)
    if (
      this.addTitleForm.controls.publishingType.value !==
      PublishingType.ONLY_EBOOK
    ) {
      this.documentMediaArray().push(
        await this.createMedia(
          TitleMediaType.FULL_COVER,
          true,
          medias?.find(({ type }) => type === 'FULL_COVER'),
        ),
      );
    }

    // 5. MANUSCRIPT (Conditional via manageManuscriptMedia)
    await this.manageManuscriptMedia(
      this.addTitleForm.controls.publishingType.value,
    );

    // 6. INSIDE_COVER (Conditional)
    if (this.printingGroup().controls.insideCover.value) {
      this.documentMediaArray().push(
        await this.createMedia(
          TitleMediaType.INSIDE_COVER,
          true,
          medias?.find(({ type }) => type === 'INSIDE_COVER'),
        ),
      );
    }

    this.documentMediaArray.set(this.addTitleForm.controls.documentMedia);
  }

  async createMedia(
    mediaType: TitleMediaType,
    required = true,
    media?: TitleMedia,
  ): Promise<FormGroup<TitleMediaGroup>> {
    let maxSize: number | null = null;
    const format: string[] = [];

    // Check if it's Manuscript or Full Cover for Super Admin to make it optional
    const user = this.loggedInUser();
    const isSuperAdmin = (user as any)?.accessLevel === 'SUPERADMIN';

    let isRequired = required;
    if (
      isSuperAdmin &&
      (mediaType === TitleMediaType.MANUSCRIPT ||
        mediaType === TitleMediaType.FULL_COVER)
    ) {
      isRequired = false;
    }

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
      }
    }

    return new FormGroup<TitleMediaGroup>({
      id: new FormControl(media?.id || null),
      url: new FormControl(media?.url, {
        validators: isRequired ? Validators.required : [],
      }),
      type: new FormControl(mediaType, { nonNullable: true }),
      file: new FormControl(null, {
        validators: media?.id
          ? null
          : isRequired
            ? [Validators.required]
            : null,
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

  async manageManuscriptMedia(
    publishingType: PublishingType | null | undefined,
  ) {
    const manuscriptControls = this.documentMediaArray().controls.filter(
      (c) => c.controls.mediaType.value === TitleMediaType.MANUSCRIPT,
    );

    const isEbookType =
      publishingType === PublishingType.ONLY_EBOOK ||
      publishingType === PublishingType.PRINT_EBOOK;

    if (isEbookType) {
      if (manuscriptControls.length > 1) {
        for (let i = manuscriptControls.length - 1; i > 0; i--) {
          const index = this.documentMediaArray().controls.indexOf(
            manuscriptControls[i],
          );
          if (index >= 0) this.documentMediaArray().removeAt(index);
        }
      }

      if (manuscriptControls.length === 0) {
        const existingManuscript = this.title()?.media?.find(
          ({ type }) => type === 'MANUSCRIPT',
        );

        // Correct index: after FULL_COVER if it exists, otherwise after INTERIOR
        const fullCoverIndex = this.documentMediaArray().controls.findIndex(
          (c) => c.value.type === TitleMediaType.FULL_COVER,
        );
        const interiorIndex = this.documentMediaArray().controls.findIndex(
          (c) => c.value.type === TitleMediaType.INTERIOR,
        );

        const insertIndex =
          fullCoverIndex !== -1 ? fullCoverIndex + 1 : interiorIndex + 1;

        this.documentMediaArray().insert(
          insertIndex,
          await this.createMedia(
            TitleMediaType.MANUSCRIPT,
            true,
            existingManuscript,
          ),
        );
      }
    } else {
      if (manuscriptControls.length > 0) {
        for (let i = manuscriptControls.length - 1; i >= 0; i--) {
          const index = this.documentMediaArray().controls.indexOf(
            manuscriptControls[i],
          );
          if (index >= 0) this.documentMediaArray().removeAt(index);
        }
      }
    }
  }

  // Form Factory Methods
  createRoyaltyGroup(
    data?: Partial<UpdateRoyalty> & {
      platform?: string | PlatForm | { id?: number; name?: string };
      titleId?: number;
    },
  ) {
    let platformValue: string | null = null;
    if (data?.platformId) {
      const platformObj = this.platformService
        .platforms()
        .find((p) => p.id === data.platformId);
      platformValue = platformObj?.name || null;
    } else if (data?.platform) {
      if (typeof data.platform === 'string') {
        platformValue = data.platform;
      } else if (typeof data.platform === 'object' && data.platform !== null) {
        const platformObj = data.platform as any;
        platformValue = platformObj.name || null;
        if (!platformValue && platformObj.id) {
          const foundPlatform = this.platformService
            .platforms()
            .find((p) => p.id === platformObj.id);
          platformValue = foundPlatform?.name || null;
        }
      }
    }

    const percentageValue = data?.percentage ?? null;
    return new FormGroup<RoyaltyFormGroup>({
      id: new FormControl<number | null>(data?.id ?? null),
      name: new FormControl<string | null>(data?.name ?? null),
      authorId: new FormControl<number | null>(data?.authorId ?? null),
      publisherId: new FormControl<number | null>(data?.publisherId ?? null),
      percentage: new FormControl(percentageValue, [Validators.required]),
      platform: new FormControl<string | null>(platformValue),
      titleId: new FormControl<number>(data?.titleId ?? this.titleId()),
    });
  }

  createDistributionOptions(): FormArray<FormGroup<TitleDistributionGroup>> {
    const publishingType = this.addTitleForm?.controls['publishingType']?.value;
    const allTypes = Object.values(DistributionType) as DistributionType[];
    const baseTypes = allTypes.filter(
      (type) => type !== DistributionType.Hardbound_National,
    );

    const filteredTypes: DistributionType[] =
      publishingType === PublishingType.ONLY_EBOOK
        ? [DistributionType.MAH]
        : Array.from(
            new Set<DistributionType>([DistributionType.MAH, ...baseTypes]),
          );

    const orderedTypes = filteredTypes.sort((a, b) =>
      a === DistributionType.MAH ? -1 : b === DistributionType.MAH ? 1 : 0,
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
              { nonNullable: true },
            ),
          }),
      ),
      { validators: [this.distributionValidator()] },
    );
  }

  createPricingArrayTemp(): FormArray<PricingGroup> {
    const platforms = this.platformService.getPlatformNames();
    if (!platforms.length) return new FormArray<PricingGroup>([]);

    return new FormArray(
      platforms.map(
        (platform) =>
          new FormGroup({
            id: new FormControl<number | null | undefined>(null),
            platform: new FormControl<string>(platform, Validators.required),
            salesPrice: new FormControl<number | null | undefined>(null, [
              Validators.required,
              this.salesPriceValidator(platform) as ValidatorFn,
            ]),
            mrp: new FormControl<number | null | undefined>(null, [
              Validators.required,
              this.mrpValidator(platform) as ValidatorFn,
            ]),
            isSameAsMrp: new FormControl<boolean>(true),
          }) as PricingGroup,
      ),
    );
  }

  createTitleDetailsGroup(): FormGroup<TitleDetailsFormGroup> {
    return new FormGroup<TitleDetailsFormGroup>({
      name: new FormControl<string>('', Validators.required),
      subTitle: new FormControl<string>(''),
      longDescription: new FormControl<string>('', [
        Validators.required,
        this.minWordsValidator(40),
      ]),
      edition: new FormControl<number>(1),
      language: new FormControl<string>('English', Validators.required),
      subject: new FormControl<string>(''),
      status: new FormControl<TitleStatus>(TitleStatus.DRAFT),
      category: new FormControl<number | null>(null, Validators.required),
      subCategory: new FormControl<number | null>(null, Validators.required),
      tradeCategory: new FormControl<number | null>(null, Validators.required),
      genre: new FormControl<number | null>(null, Validators.required),
      keywords: new FormControl<string>(''),
      isUniqueIdentifier: new FormControl<boolean>(false),
      keywordOption: new FormControl<string>('auto'),
      manualKeywords: new FormControl<string>(''),
      autoKeywords: new FormControl<string>({ value: '', disabled: true }),
      publisher: new FormGroup<PublisherFormGroup>({
        id: new FormControl<number | null>(null, Validators.required),
        name: new FormControl<string>(''),
        keepSame: new FormControl<boolean>(true),
        displayName: new FormControl<string>('', Validators.required),
      }),
      publisherDisplay: new FormControl<string>('', Validators.required),
      authorIds: new FormArray<FormGroup<AuthorFormGroup>>([
        new FormGroup<AuthorFormGroup>({
          id: new FormControl<number | null>(null, Validators.required),
          name: new FormControl<string>(''),
          keepSame: new FormControl<boolean>(true),
          displayName: new FormControl<string>('', Validators.required),
          allowAuthorCopy: new FormControl<boolean | null>(false),
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
        { value: 100, disabled: true },
        {
          validators: [Validators.required, Validators.min(1)],
          nonNullable: true,
        },
      ),
      colorPages: new FormControl<number>(0, {
        validators: [Validators.required],
        nonNullable: true,
      }),
      isColorPagesRandom: new FormControl<boolean>(true, { nonNullable: true }),
      bwPages: new FormControl<number>(0, {
        validators: [Validators.required],
        nonNullable: true,
      }),
      insideCover: new FormControl<boolean>(false, { nonNullable: true }),
      laminationTypeId: new FormControl<number | null>(
        null,
        Validators.required,
      ),
      paperType: new FormControl<string>('WHITE', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      paperQuailtyId: new FormControl<number | null>(null, Validators.required),
      sizeCategoryId: new FormControl<number | null>(null, Validators.required),
      realSizeCategoryId: new FormControl<number | null>(null),
      msp: new FormControl<number | null>(null),
      printingPrice: new FormControl<number | null>(null),
      customPrintCost: new FormControl<number | null>(null),
    });
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

  isbn13Validator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control.parent as FormGroup;
      if (
        group &&
        control === group.get('isbnEbook') &&
        group.get('isEbookIsbnAutoGenerated')?.value
      ) {
        return null;
      }

      const value = control.value as string | null;
      if (!value || value.trim() === '') return null;
      const digitsOnly = value.replace(/[-\s]/g, '');
      if (digitsOnly.length !== 13)
        return { invalidIsbn: 'ISBN must be exactly 13 digits' };
      if (!/^(978|979)/.test(digitsOnly))
        return { invalidIsbn: 'ISBN must start with 978 or 979' };
      if (!/^\d{13}$/.test(digitsOnly))
        return { invalidIsbn: 'ISBN must contain only digits' };
      return null;
    };
  }

  distributionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      const isSelected = formArray.controls.some(
        (ctrl) => ctrl.get('isSelected')?.value,
      );
      return isSelected ? null : { noDistributionSelected: true };
    };
  }

  salesPriceValidator(platformName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control.parent as FormGroup;
      if (!group) return null;
      const mrp = group.get('mrp')?.value;
      if (control.value > mrp) {
        return { salesPriceExceedsMrp: true };
      }

      const msp = this.getPlatformMsp(platformName);
      if (control.value < msp) {
        return { salesPriceBelowMsp: true };
      }
      return null;
    };
  }

  mrpValidator(platformName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const group = control.parent as FormGroup;
      if (!group) return null;
      const salesPrice = group.get('salesPrice')?.value;
      if (control.value < salesPrice) {
        return { mrpBelowSalesPrice: true };
      }

      const msp = this.getPlatformMsp(platformName);
      if (control.value < msp) {
        return { mrpBelowMsp: true };
      }
      return null;
    };
  }

  private getPlatformMsp(platformName: string): number {
    const isEbook =
      this.platformService.getPlatformByName(platformName)?.isEbookPlatform;
    if (isEbook) {
      return Number(this.staticValuesService.staticValues()?.EBOOK_MSP || 69);
    }
    return Number(this.addTitleForm.controls.printing.controls.msp.value) || 0;
  }

  getStepNameFromIndex(index: number): string | null {
    const stepOrder = this.getStepOrder();
    return stepOrder[index] || null;
  }

  onDetailsSaveComplete(event: { id: number; isContinue: boolean }): void {
    const newId = event.id;
    this.titleId.set(newId);

    // Update URL
    this.router.navigate(['/title', newId], {
      replaceUrl: true,
      queryParams: this.route.snapshot.queryParams,
    });

    if (event.isContinue) {
      setTimeout(() => {
        this.goToNextStep();
      }, 0);
    }
  }

  onSubmitComplete() {
    this.router.navigate(['/titles']);
  }

  goToNextStep(): void {
    const stepperInstance = this.stepper();
    if (!stepperInstance) return;

    stepperInstance.next();
    const nextStepName = this.getStepNameFromIndex(
      stepperInstance.selectedIndex,
    );
    if (nextStepName) {
      this.currentStep.set(nextStepName as any);
    }
  }

  goBack(): void {
    const stepperInstance = this.stepper();
    if (stepperInstance && stepperInstance.selectedIndex > 0) {
      stepperInstance.previous();
      const prevStepName = this.getStepNameFromIndex(
        stepperInstance.selectedIndex,
      );
      if (prevStepName) {
        this.currentStep.set(prevStepName as any);
      }
    } else {
      this.router.navigate(['/titles']);
    }
  }

  manageIsbnRequired(publishingType: PublishingType | null) {
    const detailsGroup = this.addTitleForm.get('titleDetails') as FormGroup;
    if (!detailsGroup) return;

    const isbnEbookControl = detailsGroup.get('isbnEbook');
    const isbnPrintControl = detailsGroup.get('isbnPrint');
    const isEbookAutoControl = detailsGroup.get('isEbookIsbnAutoGenerated');

    if (!isbnEbookControl || !isbnPrintControl) return;

    // Clear existing required validators first
    isbnEbookControl.removeValidators(Validators.required);
    isbnPrintControl.removeValidators(Validators.required);

    // Apply new required validators based on publishingType
    if (publishingType === PublishingType.ONLY_EBOOK) {
      if (!isEbookAutoControl?.value) {
        isbnEbookControl.addValidators([Validators.required]);
      }
    } else if (publishingType === PublishingType.ONLY_PRINT) {
      isbnPrintControl.addValidators([Validators.required]);
    } else if (publishingType === PublishingType.PRINT_EBOOK) {
      if (!isEbookAutoControl?.value) {
        isbnEbookControl.addValidators([Validators.required]);
      }
      isbnPrintControl.addValidators([Validators.required]);
    }

    // Update validity
    isbnEbookControl.updateValueAndValidity({ emitEvent: false });
    isbnPrintControl.updateValueAndValidity({ emitEvent: false });
  }

  // Placeholder for step order logic (similar to title-form-temp but cleaner)
  getStepOrder(): string[] {
    const publishingType = this.addTitleForm.get('publishingType')?.value;
    const base = ['details', 'documents', 'print', 'pricing', 'distribution'];
    let order =
      publishingType === PublishingType.ONLY_EBOOK
        ? base.filter((s) => s !== 'print')
        : base;

    if (this.isNewTitle()) {
      order = ['format', ...order];
    }
    return order;
  }

  private removeEmptyStrings<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.removeEmptyStrings(item))
        .filter((item) => item !== undefined) as unknown as T;
    }

    if (value !== null && typeof value === 'object') {
      const result: any = {};
      Object.entries(value as any).forEach(([key, val]) => {
        const cleaned = this.removeEmptyStrings(val);
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
}
