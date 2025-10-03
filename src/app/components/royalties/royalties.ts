import {
  Component,
  effect,
  input,
  Input,
  OnInit,
  signal,
  Signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';
import {
  Author,
  ChannalType,
  PricingGroup,
  Publishers,
} from '../../interfaces';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import {
  RoyalFormGroupAmountField,
  Royalty,
  RoyaltyFormGroup,
} from '../../interfaces/Royalty';
import { combineLatest, debounceTime, firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-royalties',
  imports: [
    SharedModule,
    MatIconModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatTableModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './royalties.html',
  styleUrl: './royalties.css',
})
export class Royalties implements OnInit {
  constructor(private translateService: TranslateService) {}

  royaltiesController =
    input.required<FormArray<FormGroup<RoyaltyFormGroup>>>();
  pricingController = input.required<FormArray<PricingGroup>>();
  authors = input.required<Author[]>();
  publisher = input.required<Publishers | null>();

  displayedColumns = signal<RoyalFormGroupAmountField[]>([
    'print_mah',
    'print_third_party',
    'prime',
    'ebook_mah',
    'ebook_third_party',
  ]);
  royaltyRows = signal<RoyaltyRow[]>([]);

  channelKeys = signal<RoyalFormGroupAmountField[]>([
    'print_mah',
    'print_third_party',
    'prime',
    'ebook_mah',
    'ebook_third_party',
  ]);

  channelLabels = signal({
    print_mah: 'Print (MAH)',
    print_third_party: 'Print (3rd Party)',
    prime: 'Prime',
    ebook_mah: 'E-Book (MAH)',
    ebook_third_party: 'E-Book (3rd Party)',
  });

  totalRoyaties = signal<Record<RoyalFormGroupAmountField, number>>({
    print_mah: 0,
    print_third_party: 0,
    prime: 0,
    ebook_mah: 0,
    ebook_third_party: 0,
  });

  totalRoyaltiesAmount = signal<{
    authors: Partial<
      Record<string, Partial<Record<RoyalFormGroupAmountField, number>>>
    >;
    publisher: Partial<
      Record<string, Partial<Record<RoyalFormGroupAmountField, number>>>
    >;
  }>({
    authors: {},
    publisher: {},
  });

  ngOnInit() {
    this.displayedColumns.set([...this.channelKeys()]);
    this.calculateTotalRoyalties();
    this.calculateRoyaltyAmountPerPerson();
  }

  async validateTotalRoyaltyByType(
    totalRoyaties: Record<RoyalFormGroupAmountField, number>
  ) {
    if (!this.translateService) return;

    const overRoyalties = Object.keys(totalRoyaties)
      .filter((key) => totalRoyaties[key as RoyalFormGroupAmountField] > 100)
      .map((key) => this.translateService.instant(key));

    if (overRoyalties.length) {
      this.royaltiesController().setErrors({
        invalid: `Total royalties for specific channal cannot be higer then 100. fix ${overRoyalties.join(
          ','
        )}`,
      });
    } else {
      this.royaltiesController().setErrors(null);
    }
  }

  calculateTotalRoyalties() {
    this.royaltiesController()
      .valueChanges.pipe(debounceTime(400))
      .subscribe((data) => {
        const totalToUpdate = this.totalRoyaties();
        Object.keys(this.totalRoyaties()).forEach((key) => {
          this.totalRoyaties.update((totalRoyaties) => {
            const keyTotal = data.reduce(
              (a, d) => a + Number(d[key as RoyalFormGroupAmountField] || 0),
              0
            );
            totalRoyaties[key as RoyalFormGroupAmountField] = keyTotal;
            return totalToUpdate;
          });
        });

        this.validateTotalRoyaltyByType(this.totalRoyaties());
      });
  }

  calculateRoyaltyAmountPerPerson() {
    combineLatest([
      this.royaltiesController().valueChanges,
      this.pricingController().valueChanges,
    ])
      .pipe(debounceTime(400))
      .subscribe(([data]) => {
        const temp = this.totalRoyaltiesAmount();

        data.forEach((royalty) => {
          temp[royalty.authorId ? 'authors' : 'publisher'] = {
            ...(temp[royalty.authorId ? 'authors' : 'publisher'][
              royalty.authorId || royalty.publisherId || 0
            ] = {}),
          };

          const prices: Partial<Record<RoyalFormGroupAmountField, number>> = {};
          this.channelKeys().map((key) => {
            console.log({ key });

            prices[key as RoyalFormGroupAmountField] =
              this.caculateAmountForRoyaltiesField(
                key as RoyalFormGroupAmountField,
                royalty[key as RoyalFormGroupAmountField] || 0
              );
          });

          temp[royalty.authorId ? 'authors' : 'publisher'][
            royalty.authorId || royalty.publisherId || 0
          ] = prices;
        });

        this.totalRoyaltiesAmount.set(temp);
      });
  }

  caculateAmountForRoyaltiesField(
    field: RoyalFormGroupAmountField,
    percent: number
  ) {
    let ch: ChannalType;
    switch (field) {
      case 'ebook_mah':
        ch = ChannalType.EBOOK_MAH;
        break;
      case 'ebook_third_party':
        ch = ChannalType.EBOOK_THIRD_PARTY;
        break;
      case 'prime':
        ch = ChannalType.PRIME;
        break;
      case 'print_mah':
        ch = ChannalType.PRINT_MAH;
        break;
      case 'print_third_party':
        ch = ChannalType.EBOOK_THIRD_PARTY;
        break;
    }

    const salesPrice =
      this.pricingController().controls.filter(
        ({ controls: { channal } }) => channal.value === ch
      )[0]?.controls?.salesPrice?.value || 0;

    return Number((salesPrice * (percent / 100)).toFixed(2));
  }

  submitRoyalties() {
    // const payload = this.royaltyRows.map((row) => {
    //   const { name, ...data } = row;
    //   return data;
    // });
    // console.log('API Payload:', payload);
  }
}
interface RoyaltyRow extends Royalty {
  name: string;
}
