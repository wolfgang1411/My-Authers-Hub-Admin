import {
  Component,
  computed,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';
import {
  Author,
  PlatForm,
  PricingGroup,
  Publishers,
} from '../../../interfaces';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { Royalty, RoyaltyFormGroup } from '../../../interfaces/Royalty';
import { combineLatest, debounceTime, Subject, takeUntil } from 'rxjs';
import { StaticValuesService } from '../../../services/static-values';
import { GroupRoyaltiesPipe } from '../../../pipes/group-royalties-pipe';

@Component({
  selector: 'app-temp-royalties',
  imports: [
    SharedModule,
    MatIconModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatTableModule,
    MatInputModule,
    FormsModule,
    GroupRoyaltiesPipe,
  ],
  templateUrl: './temp-royalties.html',
  styleUrl: './temp-royalties.css',
})
export class TempRoyalties implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(private staticValueService: StaticValuesService) {}

  royaltiesController =
    input.required<FormArray<FormGroup<RoyaltyFormGroup>>>();
  pricingController = input.required<FormArray<PricingGroup>>();
  authors = input.required<Author[]>();
  publisher = input.required<Publishers | null>();
  printingPrice = input.required<number | null>();

  displayedColumns = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.PlatForm || {}
    ) as PlatForm[];
  });

  totalRoyalties = signal<Partial<Record<PlatForm, number>>>({});
  totalRoyaltiesAmount = signal<
    Record<string, Partial<Record<PlatForm, number>> | undefined>
  >({});

  ngOnInit() {
    this.calculateTotalRoyalties();
    this.calculateRoyaltyAmountPerPerson();
  }

  validatateTotalRoyalties() {
    Object.keys(this.totalRoyalties()).forEach((key) => {
      const val = (this.totalRoyalties() as any)[key] as number;
      console.log({ val });
      if (val > 100) {
        this.royaltiesController().setErrors({
          ...this.royaltiesController().errors,
          invalid: `Royalties for ${key} cannot be higher then 100`,
        });
      }
    });
  }

  calculateTotalRoyalties() {
    this.royaltiesController()
      .valueChanges.pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe((data) => {
        const temp: Partial<Record<PlatForm, number>> = {};
        Object.keys(this.staticValueService.staticValues()?.PlatForm || {}).map(
          (platform) => {
            temp[platform as PlatForm] = data
              .filter((d) => d.platform === platform)
              .reduce((a, { percentage }) => a + (percentage || 0), 0);
          }
        );
        this.totalRoyalties.set(temp);
        this.validatateTotalRoyalties();
      });
  }

  calculateRoyaltyAmountPerPerson() {
    combineLatest([
      this.royaltiesController().valueChanges,
      this.pricingController().valueChanges,
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

          const exisitingData = temp[key];
          if (!exisitingData) {
            temp[key] = {};
          }

          const salesPrice = this.pricingController().controls.find(
            ({ controls }) => controls.platform.value === platform
          )?.controls.salesPrice?.value;

          // For ebook platforms, don't subtract printing cost
          // For other platforms, subtract printing cost
          const isEbookPlatform = ebookPlatforms.includes(platform as PlatForm);
          const printingCost = isEbookPlatform ? 0 : (this.printingPrice() || 0);

          temp[key][platform as PlatForm] = Number(
            percentage
              ? ((salesPrice - printingCost) * (percentage / 100)).toFixed(2)
              : 0
          );
        });

        this.totalRoyaltiesAmount.set(temp);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
