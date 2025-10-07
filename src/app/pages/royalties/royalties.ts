import { Component, signal } from '@angular/core';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LayoutModule } from '@angular/cdk/layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { RoyaltyService } from '../../services/royalty-service';
import {
  CreateRoyalty,
  RoyalFormGroupAmountField,
  Royalty,
  RoyaltyFilter,
} from '../../interfaces';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, Subject } from 'rxjs';
import { AuthorsService } from '../authors/authors-service';
import { PublisherService } from '../publisher/publisher-service';
import { TitleService } from '../titles/title-service';
import { AddRoyalty } from '../../components/add-royalty/add-royalty';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-royalties',
  imports: [
    LayoutModule,
    SharedModule,
    ListTable,
    AngularSvgIconModule,
    RouterModule,
    MatButton,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './royalties.html',
  styleUrl: './royalties.css',
})
export class Royalties {
  constructor(
    private royaltyService: RoyaltyService,
    private authorService: AuthorsService,
    private publisher: PublisherService,
    private dialog: MatDialog
  ) {}
  displayedColumns: string[] = [
    'serial',
    'author',
    'publisher',
    'title',
    'print_mah',
    'print_third_party',
    'prime',
    'ebook_mah',
    'ebook_third_party',
    'earnings',
  ];
  filter: RoyaltyFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
  };

  dataSource = new MatTableDataSource<any>();
  searchStr = new Subject<string>();
  searchStr$ = this.searchStr
    .asObservable()
    .pipe(debounceTime(800))
    .subscribe((value) => {
      this.filter.searchStr = value;
      this.filter.page = 1;
      this.updateRoyaltyList();
    });

  lastPage = signal(1);
  royaltyList = signal<Royalty[]>([]);
  ngOnInit(): void {
    this.updateRoyaltyList();
  }

  async updateRoyaltyList() {
    const royaltyResponse = await this.royaltyService.getRoyalties(this.filter);
    const items: Royalty[] = royaltyResponse.items;
    const uniqueAuthorIds = Array.from(
      new Set(
        items
          .map((r) => r.authorId)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );
    const uniquePublisherIds = Array.from(
      new Set(
        items
          .map((r) => r.publisherId)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    );
    const authorMap = new Map<number, string>();
    const publisherMap = new Map<number, string>();
    for (const authorId of uniqueAuthorIds) {
      const author = await this.authorService.getAuthorrById(authorId);
      authorMap.set(
        authorId,
        author.user.firstName + ' ' + author.user.lastName
      );
    }
    for (const publisherId of uniquePublisherIds) {
      const publisher = await this.publisher.getPublisherById(publisherId);
      publisherMap.set(publisherId, publisher.name);
    }
    const grouped = new Map<string, CreateRoyalty>();
    items.forEach(async (royalty) => {
      const authorId = royalty.authorId ?? null;
      const publisherId = royalty.publisherId ?? null;
      const titleId = royalty.titleId ?? null;
      const key = `${authorId ?? 'null'}-${publisherId ?? 'null'}-${titleId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          titleId: 0,
          authorId: royalty.authorId ?? null,
          author: authorId ? authorMap.get(authorId) ?? 'N/A' : 'N/A',
          publisher: publisherId
            ? publisherMap.get(publisherId) ?? 'N/A'
            : 'N/A',
          // title: titlename.name,
          publisherId: royalty.publisherId ?? null,
          print_mah: null,
          print_third_party: null,
          prime: null,
          ebook_mah: null,
          ebook_third_party: null,
          name: null,
          totalEarnings:
            royalty.earnings && royalty.earnings.length
              ? royalty.earnings.reduce((acc, earning) => {
                  return acc + earning.amount;
                }, 0)
              : 0,
        });
      }

      const group = grouped.get(key)!;

      const channalMap: Record<string, RoyalFormGroupAmountField> = {
        PRINT_MAH: 'print_mah',
        PRINT_THIRD_PARTY: 'print_third_party',
        PRIME: 'prime',
        EBOOK_MAH: 'ebook_mah',
        EBOOK_THIRD_PARTY: 'ebook_third_party',
      };

      const field = channalMap[royalty.channal];

      if (field) {
        group[field] = royalty.percentage;
      }
    });

    const groupedData = Array.from(grouped.entries()).map(
      ([key, royaltyGroup], index) => ({
        serial: index + 1,
        authorOrPublisherId: royaltyGroup.authorId ?? royaltyGroup.publisherId,
        ...royaltyGroup,
      })
    );

    this.dataSource.data = groupedData;
    this.lastPage.set(
      Math.ceil(royaltyResponse.totalCount / royaltyResponse.itemsPerPage)
    );
  }
  addRoyalty() {
    const dialog = this.dialog.open(AddRoyalty, {
      data: {
        onSubmit: async (royaltyArray: CreateRoyalty[]) => {
          if (royaltyArray.length) {
            const response = await this.royaltyService.createRoyalties(
              royaltyArray
            );
            if (response) {
              dialog.close();
              Swal.fire({
                title: 'success',
                text: 'The Royalties have been created successfully!',
                icon: 'success',
                heightAuto: false,
              });
              this.updateRoyaltyList();
            }
          }
        },
        onClose: () => {
          dialog.close();
        },
      },
    });
  }
}
