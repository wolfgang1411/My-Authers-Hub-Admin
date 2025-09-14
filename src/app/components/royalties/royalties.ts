import {
  Component,
  computed,
  effect,
  Input,
  OnChanges,
  OnInit,
  Signal,
  SimpleChanges,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';
import { Author, ChannalType, Publishers } from '../../interfaces';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { RoyaltyStatus } from '../../interfaces/Royalty';
import { MatInputModule } from '@angular/material/input';

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
  @Input() _formBuilder!: FormBuilder;
  @Input() titleForm!: FormGroup;
  @Input() royalties!: FormArray;
  @Input({ required: true }) authors!: Signal<Author[]>;
  @Input({ required: true }) publisher!: Signal<Publishers | null>;
  displayedColumns: string[] = [];
  royaltyRows: RoyaltyRow[] = [];
  constructor() {
    effect(() => {
      console.log(
        'effect triggered → authors:',
        this.authors(),
        'publisher:',
        this.publisher()
      );
      this.buildRows();
    });
  }

  channelOptions = [
    { value: 'PRINT_MAH', label: 'Print (MAH)' },
    { value: 'PRINT_THIRD_PARTY', label: 'Print (3rd Party)' },
    { value: 'PRIME', label: 'Prime' },
    { value: 'EBOOK_MAH', label: 'eBook (MAH)' },
    { value: 'EBOOK_THIRD_PARTY', label: 'eBook (3rd Party)' },
    { value: 'AUTHOR', label: 'Author' },
    { value: 'PUBLISHER', label: 'Publisher' },
  ];

  ngOnInit() {
    this.displayedColumns = [
      'party',
      ...this.channelOptions.map((c) => c.value),
    ];
    console.log(this.authors(), this.publisher(), 'author & publisher');
  }

  buildRows() {
    this.royaltyRows = [];
    const authors = this.authors();
    console.log(authors, 'authorssss');
    if (authors?.length) {
      this.royaltyRows = authors.map((a: Author) => ({
        id: a.id,
        name:
          a.username ||
          a.name ||
          (a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Author'),
        type: 'author',
        ...this.channelOptions.reduce(
          (acc, c) => ({ ...acc, [c.value]: null }),
          {}
        ),
      }));
    }
    const publisher = this.publisher();
    console.log(publisher, 'publisherrrrrrrrrrrrr');
    if (publisher) {
      this.royaltyRows.push({
        id: publisher.id,
        name: publisher.name || 'ritika',
        type: 'publisher',
        ...this.channelOptions.reduce(
          (acc, c) => ({ ...acc, [c.value]: null }),
          {}
        ),
      });
    }

    console.log('Updated royaltyRows:', this.royaltyRows);
  }
  submitRoyalties() {
    const titleId = this.titleForm.get('titleDetails.id')?.value || 1;

    const apiPayload = this.royaltyRows.flatMap((row) =>
      this.channelOptions
        .filter((c) => row[c.value] != null)
        .map((c) => ({
          titleId,
          percentage: row[c.value],
          channal: c.value,
          ...(row.type === 'author'
            ? { authorId: row.id }
            : { publisherId: row.id }),
        }))
    );

    console.log('API Payload:', apiPayload);
  }
}
interface RoyaltyRow {
  id: number;
  name: string;
  type: 'author' | 'publisher';
  [channel: string]: number | string | undefined;
}
