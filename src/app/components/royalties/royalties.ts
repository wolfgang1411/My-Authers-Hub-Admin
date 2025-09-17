import { Component, effect, Input, OnInit, Signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';
import { Author, Publishers } from '../../interfaces';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { Royalty } from '../../interfaces/Royalty';

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
  displayedColumns = [
    'party',
    'print_mah',
    'print_third_party',
    'prime',
    'ebook_mah',
    'ebook_third_party',
  ];
  royaltyRows: RoyaltyRow[] = [];
  constructor() {
    effect(() => {
      this.buildRows();
    });
  }

  channelKeys = [
    'print_mah',
    'print_third_party',
    'prime',
    'ebook_mah',
    'ebook_third_party',
  ];

  channelLabels: Record<string, string> = {
    print_mah: 'Print (MAH)',
    print_third_party: 'Print (3rd Party)',
    prime: 'Prime',
    ebook_mah: 'E-Book (MAH)',
    ebook_third_party: 'E-Book (3rd Party)',
  };

  ngOnInit() {
    this.displayedColumns = ['party', ...this.channelKeys];
  }
  initEmptyRoyalties() {
    return {
      print_mah: 0,
      print_third_party: 0,
      prime: 0,
      ebook_mah: 0,
      ebook_third_party: 0,
    };
  }
  buildRows() {
    const authors = this.authors();
    const publisher = this.publisher();
    const titleId = this.titleForm.get('titleDetails.id')?.value || 1;

    // Clear existing rows
    this.royaltyRows = [];

    // Add rows for authors
    if (authors?.length) {
      this.royaltyRows.push(
        ...authors.map((author) => ({
          id: 0,
          titleId,
          authorId: author.id,
          publisherId: null,
          ...this.initEmptyRoyalties(),
          name:
            author.username ||
            author.name ||
            (author.user
              ? `${author.user.firstName} ${author.user.lastName}`
              : 'Author'),
        }))
      );
    }
    if (publisher) {
      this.royaltyRows.push({
        id: 0,
        titleId,
        authorId: null,
        publisherId: publisher.id,
        ...this.initEmptyRoyalties(),
        name: publisher.name || 'Publisher',
      });
    }

    console.log('Built royalty rows:', this.royaltyRows);
  }

  submitRoyalties() {
    const payload = this.royaltyRows.map((row) => {
      const { name, ...data } = row;
      return data;
    });

    console.log('API Payload:', payload);
  }
}
interface RoyaltyRow extends Royalty {
  name: string;
}
