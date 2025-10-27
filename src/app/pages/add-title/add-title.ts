import {
  Component,
  effect,
  ElementRef,
  inject,
  QueryList,
  Signal,
  signal,
  viewChild,
  ViewChild,
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
} from 'rxjs';
import { StepperOrientation } from '@angular/cdk/stepper';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  FormBuilder,
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
  ChannalType,
  CreateRoyalty,
  DistributionType,
  LaminationType,
  PaperType,
  PricingCreate,
  PricingGroup,
  PrintingCreate,
  PrintingFormGroup,
  PublisherFormGroup,
  Publishers,
  PublisherStatus,
  PublishingType,
  RoyalFormGroupAmountField,
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
} from '../../interfaces';
import { MatSelectModule } from '@angular/material/select';
import { PublisherService } from '../publisher/publisher-service';
import { AuthorsService } from '../authors/authors-service';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { PrintingService } from '../../services/printing-service';
import { TitlePrinting } from '../../components/title-printing/title-printing';
import { Royalties } from '../../components/royalties/royalties';
import { TitleService } from '../titles/title-service';
import { BookDetails } from '../../components/book-details/book-details';
import { Pricing } from '../../components/pricing/pricing';
import { TitleDistribution } from '../../title-distribution/title-distribution';
import Swal from 'sweetalert2';
import { getFileSizeFromS3Url, getFileToBase64 } from '../../common/utils/file';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-add-title',
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
    TitlePrinting,
    BookDetails,
    Pricing,
    Royalties,
    TitleDistribution,
  ],
  templateUrl: './add-title.html',
  styleUrl: './add-title.css',
})
export class AddTitle {
  constructor(
    private printingService: PrintingService,
    private titleService: TitleService,
    private publisherService: PublisherService,
    private authorService: AuthorsService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService
  ) {
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
    this.route.params.subscribe(({ titleId }) => {
      this.titleId = Number(titleId);
    });

    effect(() => {
      const publisher = this.publisherSignal();
      const authors = this.authorsSignal();

      this.mapRoyaltiesArray(publisher, authors);

      // Put your logic here — this runs whenever either signal changes
    });
  }
  @ViewChildren('fileInput') fileInputs!: QueryList<
    ElementRef<HTMLInputElement>
  >;

  stepperOrientation: Observable<StepperOrientation>;
  bindingType!: BookBindings[];
  laminationTypes!: LaminationType[];
  authorsSignal = signal<Author[]>([]);
  publisherSignal = signal<Publishers | null>(null);
  titleId!: number;
  publishers = signal<Publishers[]>([]);
  authorsList = signal<Author[]>([]);
  titleDetails = signal<Title | null>(null);

  private stepper = viewChild<MatStepper>('stepperForm');

  ChannalTypes = signal([
    'PRINT_MAH',
    'PRINT_THIRD_PARTY',
    'PRIME',
    'EBOOK_MAH',
    'EBOOK_THIRD_PARTY',
  ]);
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
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.fetchAndUpdatePublishingPoints();
      });

    let media: TitleMedia[] = [];
    if (this.titleId) {
      const response = await this.titleService.getTitleById(this.titleId);
      this.titleDetails.set(response);
      this.prefillFormData(response);
      media = response?.media || [];
    }

    this.calculatePrintingCost();
    this.addDefaultMediaArray(media);
    this.handelInsideCoverMedia();
  }

  async fetchAndUpdatePublishingPoints() {
    const publisherId =
      this.tempForm.controls.titleDetails.controls.publisher.controls.id.value;

    if (publisherId) {
      try {
        const { items: publishingPoints } =
          await this.publisherService.fetchPublishingPoints(publisherId);

        publishingPoints.forEach(({ distributionType, availablePoints }) => {
          const distributionController =
            this.tempForm.controls.distribution.controls.find(
              ({ controls: { type } }) => type.value === distributionType
            );

          if (distributionController) {
            distributionController.controls.availablePoints.patchValue(
              availablePoints
            );
          }
        });
      } catch (error) {
        console.log(error);
      }
    }
  }

  mapRoyaltiesArray(publisher: Publishers | null, authors: Author[]) {
    if (
      !publisher ||
      !authors ||
      !authors.length ||
      !this.tempForm.controls.printing.valid ||
      !this.tempForm.controls.pricing.valid
    ) {
      return;
    }
    const royaltyControl = this.tempForm.controls.royalties;

    const pulisherId = publisher.id;
    const authorIds = authors.map(({ id }) => id);

    while (
      royaltyControl.controls.filter(
        ({ controls }) =>
          controls.publisherId.value !== pulisherId &&
          !authorIds.includes(controls.authorId.value || 0)
      ).length
    ) {
      const removeIndex = royaltyControl.controls.indexOf(
        royaltyControl.controls.filter(
          ({ controls }) =>
            controls.publisherId.value !== pulisherId &&
            !authorIds.includes(controls.authorId.value || 0)
        )[0]
      );
      if (removeIndex >= 0) {
        royaltyControl.removeAt(removeIndex);
      }
    }

    const isPublisherControlExisit = royaltyControl.controls.filter(
      ({ controls }) => controls.publisherId.value === publisher.id
    )[0];

    if (!isPublisherControlExisit) {
      royaltyControl.push(
        this.createRoyaltyGroup({
          publisherId: publisher.id,
          titleId: this.titleId,
          name:
            publisher.name ||
            publisher.user.firstName ||
            '' + ' ' + publisher.user.lastName ||
            '',
        })
      );
    }

    authors.forEach(({ id: authorId, name, user }) => {
      const isAuthorControlExisit = royaltyControl.controls.filter(
        ({ controls }) => controls.authorId.value === authorId
      )[0];

      if (!isAuthorControlExisit) {
        royaltyControl.push(
          this.createRoyaltyGroup({
            authorId: authorId,
            titleId: this.titleId,
            name: name || (user.firstName || '') + ' ' + (user.lastName || ''),
          })
        );
      }
    });
  }

  createRoyaltyGroup(data?: UpdateRoyalty) {
    return new FormGroup<RoyaltyFormGroup>({
      id: new FormControl<number | null>(null),
      name: new FormControl<string | null>(data?.name || null),
      authorId: new FormControl<number | null>(data?.authorId || null),
      publisherId: new FormControl<number | null>(data?.publisherId || null),
      ebook_mah: new FormControl<number>(data?.ebook_mah || 0),
      ebook_third_party: new FormControl<number>(data?.ebook_third_party || 0),
      prime: new FormControl<number>(data?.prime || 0),
      print_mah: new FormControl<number>(data?.print_mah || 0),
      print_third_party: new FormControl<number>(data?.print_third_party || 0),
      titleId: new FormControl<number>(this.titleId),
    });
  }

  getFieldForChannal(channal: ChannalType) {
    const temp: Partial<Record<ChannalType, RoyalFormGroupAmountField>> = {};
    Object.keys(ChannalType).forEach((ch) => {
      let field: RoyalFormGroupAmountField = 'ebook_mah';

      switch (channal) {
        case ChannalType.EBOOK_MAH:
          field = 'ebook_mah';
          break;
        case ChannalType.EBOOK_THIRD_PARTY:
          field = 'ebook_third_party';
          break;
        case ChannalType.PRIME:
          field = 'prime';
          break;
        case ChannalType.PRINT_MAH:
          field = 'print_mah';
          break;
        case ChannalType.PRINT_THIRD_PARTY:
          field = 'print_third_party';
          break;
      }

      temp[ch as ChannalType] = field;
    });

    return temp[channal] as RoyalFormGroupAmountField;
  }
  async calculatePrintingCost() {
    const printGroup = this.tempForm.controls.printing;

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

    if (
      !(
        colorPages &&
        totalPages &&
        paperQuailtyId &&
        sizeCategoryId &&
        laminationTypeId &&
        bookBindingsId
      )
    ) {
      return;
    }

    const payload: TitlePrintingCostPayload = {
      colorPages: +(colorPages ?? 10),
      bwPages: +(bwPages ?? 10),
      paperQuailtyId,
      sizeCategoryId,
      totalPages: +(totalPages ?? 20),
      laminationTypeId,
      isColorPagesRandom: !!isColorPagesRandom,
      bindingTypeId: bookBindingsId,
      insideCover: !!insideCover,
    };

    const mspController = this.tempForm.controls.printing.controls.msp;
    const response = await this.printingService.getPrintingPrice(payload);
    mspController?.patchValue(response.printPerItem);
  }

  prefillFormData(data: Title): void {
    this.tempForm.patchValue({
      printingFormat: data.publishingType,
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
    }

    const royaltControlData = data.royalties?.reduce(
      (acc, { authorId, publisherId, channal, percentage }) => {
        const isAuthorOrPubllisherPut = acc.filter(
          (a) => a.authorId === authorId || a.publisherId === publisherId
        )[0] as CreateRoyalty | undefined;

        let d: Partial<CreateRoyalty> = {
          ...isAuthorOrPubllisherPut,
        };

        if (isAuthorOrPubllisherPut) {
          d[this.getFieldForChannal(channal)] = percentage;
          acc = acc.map(
            (a) =>
              (a.authorId === authorId || a.publisherId === publisherId
                ? d
                : a) as CreateRoyalty
          );
        } else {
          d['authorId'] = authorId;
          d['publisherId'] = publisherId;
          d[this.getFieldForChannal(channal)] = percentage;
          const author = this.authorsList().filter(
            ({ id }) => id == authorId
          )[0];
          const publisher = this.publishers().filter(
            ({ id }) => id == publisherId
          )[0];
          d['name'] =
            publisher?.name ||
            author?.name ||
            author?.user?.firstName ||
            '' + ' ' + author?.user?.lastName ||
            '';
          acc.push(d as CreateRoyalty);
        }

        return acc;
      },
      Array<CreateRoyalty>()
    );

    royaltControlData?.forEach((d) => {
      const { authorId: aId, publisherId: pId } = d;
      const controlExisit = this.tempForm.controls.royalties.controls.filter(
        ({ controls: { authorId, publisherId } }) =>
          authorId.value === aId || publisherId.value === pId
      )[0];
      if (controlExisit) {
        controlExisit.patchValue(d);
      } else {
        this.tempForm.controls.royalties.push(this.createRoyaltyGroup(d));
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
    pricing?.forEach(({ channal, id, mrp, salesPrice }) => {
      const pricingControl = this.tempForm.controls['pricing'].controls?.filter(
        ({ controls }) => controls.channal.value === channal
      )[0];

      if (pricingControl) {
        pricingControl.patchValue({
          id,
          channal,
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
      )
    );
  }

  createPricingArrayTemp(): FormArray<PricingGroup> {
    return new FormArray(
      Object.keys(ChannalType).map(
        (channal) =>
          new FormGroup({
            id: new FormControl<number | null | undefined>(null),
            channal: new FormControl<string>(channal, Validators.required),
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
    });
  }

  createPrintingGroupTemp(): FormGroup<PrintingFormGroup> {
    return new FormGroup<PrintingFormGroup>({
      id: new FormControl<number | null>(null),
      bookBindingsId: new FormControl<number | null>(null, Validators.required),
      totalPages: new FormControl<number>(
        {
          value: 0,
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
      .pipe(debounceTime(400))
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
      const res = await getFileSizeFromS3Url(media.url);
      if (res) {
        size = Number((res / (1024 * 1024)).toFixed(2));
      }
    }

    return new FormGroup<TitleMediaGroup>({
      id: new FormControl(media?.id || null),
      url: new FormControl(media?.url, {
        validators: required ? Validators.required : [],
      }),
      type: new FormControl(mediaType, { nonNullable: true }),
      file: new FormControl(null),
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

    if (!file) return;

    const fileSizeInMB = file.size / (1024 * 1024);

    const maxAllowedSize = mediaGroup.controls.maxSize.value;
    if (maxAllowedSize && fileSizeInMB > maxAllowedSize) {
      const errorText = `Maximum allowed size is (${maxAllowedSize} MB) <br> Uploaded file is (${fileSizeInMB} MB)`;
      Swal.fire({
        icon: 'error',
        title: 'Incorrect file size',
        html: errorText,
      });
      return;
    }

    const url = await getFileToBase64(file);

    mediaGroup.patchValue({
      url,
      file,
      name: file.name,
    });
  }

  removeFile(index: number) {
    this.tempForm.controls.documentMedia.at(index).patchValue({
      file: null,
      url: null,
    });
  }

  onTitleSubmit() {
    if (!this.tempForm.controls.titleDetails.valid) {
      return;
    }

    const titleDetails = this.tempForm.controls.titleDetails?.value;
    const basicData: TitleCreate = {
      publishingType: this.tempForm.controls.publishingType
        .value as PublishingType,
      isbnPrint: titleDetails?.isbnPrint ?? '',
      isbnEbook: titleDetails.isbnEbook ?? '',
      categoryId: titleDetails.category as number,
      subCategoryId: titleDetails.subCategory as number,
      tradeCategoryId: titleDetails.tradeCategory as number,
      genreId: titleDetails.genre as number,
      publisherDisplay: titleDetails.publisher?.displayName as string,
      publisherId: titleDetails.publisher?.id as number,
      name: titleDetails.name as string,
      subTitle: titleDetails.subTitle as string,
      subject: titleDetails.subject as string,
      language: titleDetails.language,
      longDescription: titleDetails.longDescription,
      shortDescription: titleDetails.shortDescription,
      edition: titleDetails.edition,
      keywords: titleDetails.keywords,
      isUniqueIdentifier: false,
      authorIds:
        titleDetails.authorIds && titleDetails.authorIds.length > 0
          ? titleDetails.authorIds.map((author: any) => ({
              id: author.id,
              displayName: author.displayName || '',
            }))
          : [],
      id: this.titleId,
    } as TitleCreate;
    console.log(titleDetails, 'valuee title');
    console.log(basicData, 'basicccccc');
    this.titleService.createTitle(basicData).then((res: { id: number }) => {
      this.titleId = res.id;
      this.stepper()?.next();
    });
  }

  async onMediaUpload() {
    if (this.tempForm.controls.documentMedia.valid) {
      const mediaToUpload = this.tempForm.controls.documentMedia.value
        .filter(({ file, type }) => file && type)
        .map(({ file, type }) => ({
          file: file as File,
          type: type as TitleMediaType,
        }));
      const mediaResposne = await this.titleService.uploadMultiMedia(
        this.titleId,
        mediaToUpload
      );

      const interior = mediaResposne.find(
        ({ type }) => type === TitleMediaType.INTERIOR
      );
      this.tempForm.controls.printing.controls.totalPages.patchValue(
        interior?.noOfPages || 0
      );

      this.stepper()?.next();
    }
  }

  async onPricingSubmit() {
    const pricingControls = this.tempForm.controls.pricing;

    if (pricingControls.valid) {
      const data: PricingCreate[] = pricingControls.controls.map(
        ({ controls: { channal, id, mrp, salesPrice } }) => ({
          id: id.value,
          channal: channal.value,
          mrp: Number(mrp.value),
          salesPrice: Number(salesPrice.value),
          titleId: Number(this.titleId),
        })
      );

      await this.titleService.createManyPricing(data, this.titleId);
      this.stepper()?.next();
    }
  }

  async savePrintingDraft() {
    const printing = this.tempForm.controls.printing;
    const printingDetails = this.tempForm.get('printing')?.value;
    const insideCoverMedia = this.tempForm.controls.documentMedia.controls.find(
      ({ controls: { type } }) => type.value === TitleMediaType.INSIDE_COVER
    );

    console.log({ insideCoverMedia });

    if (printing?.valid) {
      if (printing.controls.insideCover.value && !insideCoverMedia?.valid) {
        Swal.fire({
          icon: 'error',
          title: this.translateService.instant('error'),
          html: this.translateService.instant('missinginsicovermediaerror'),
        });
        return;
      }

      if (
        insideCoverMedia?.controls?.file?.value &&
        printing.controls.insideCover.value
      ) {
        await this.titleService.uploadMedia(this.titleId, {
          file: insideCoverMedia?.controls?.file?.value,
          type: TitleMediaType.INSIDE_COVER,
        });
      }

      const createPrinting: PrintingCreate = {
        id: printingDetails?.id,
        titleId: Number(this.titleId),
        bindingTypeId: Number(printingDetails?.bookBindingsId),
        totalPages: printing.controls.totalPages.value,
        colorPages: Number(printingDetails?.colorPages),
        laminationTypeId: Number(printingDetails?.laminationTypeId),
        paperType: printingDetails?.paperType as PaperType,
        paperQuailtyId: Number(printingDetails?.paperQuailtyId),
        sizeCategoryId: Number(printingDetails?.sizeCategoryId),
        customPrintCost: Number(0),
        insideCover: printingDetails?.insideCover || false,
        isColorPagesRandom: printingDetails?.isColorPagesRandom || false,
      };

      const response = await this.titleService.createOrUpdatePrinting(
        createPrinting
      );
      printing.controls.id.patchValue(response.id);
      await this.calculatePrintingCost();
      this.stepper()?.next();
    }
  }

  async saveRoyalties() {
    const royaltiesControl = this.tempForm.controls.royalties;
    console.log({ royaltiesControl });

    if (royaltiesControl.valid) {
      const data: UpdateRoyalty[] = royaltiesControl.controls.map(
        ({
          controls: {
            id: { value: id },
            authorId: { value: authorId },
            ebook_mah: { value: ebook_mah },
            ebook_third_party: { value: ebook_third_party },
            name: { value: name },
            prime: { value: prime },
            print_mah: { value: print_mah },
            print_third_party: { value: print_third_party },
            publisherId: { value: publisherId },
          },
        }) => ({
          id,
          authorId,
          ebook_mah: Number(ebook_mah),
          ebook_third_party: Number(ebook_third_party),
          prime: Number(prime),
          print_mah: Number(print_mah),
          print_third_party: Number(print_third_party),
          name,
          publisherId,
          titleId: this.titleId,
        })
      );

      const res = await Promise.all(
        data.map(async (d) => this.titleService.createOrUpdateRoyaties(d))
      );

      console.log({ res });

      this.stepper()?.next();
    }
    this.titleService.createManyPricing;
  }

  async onClickPurchasePoint(type: DistributionType) {
    try {
      const res = await this.publisherService.buyPublishingPoints(type, 1);
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
    const selectedDistributions = this.tempForm.controls.distribution.value
      .filter(({ isSelected }) => isSelected)
      .map(({ type }) => type as DistributionType);
    if (
      this.tempForm.controls.distribution.valid &&
      selectedDistributions.length
    ) {
      await this.titleService.createTitleDistribution(
        this.titleId,
        selectedDistributions
      );

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Title has been send for approval to admin',
      });
      this.router.navigate(['/titles']);
    }
  }
}
