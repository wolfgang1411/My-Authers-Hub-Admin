import { Component, effect, input } from '@angular/core';
import { CreateRoyalty, Royalty } from '../../interfaces';
import { ListTable } from '../list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { AuthorsService } from '../../pages/authors/authors-service';
import { PublisherService } from '../../pages/publisher/publisher-service';

@Component({
  selector: 'app-royalty-table',
  imports: [ListTable],
  templateUrl: './royalty-table.html',
  styleUrl: './royalty-table.css',
})
export class RoyaltyTable {
  royalties = input<Royalty[] | null | undefined>();
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
  dataSource = new MatTableDataSource<any>();

  constructor(
    private authorService: AuthorsService,
    private publisher: PublisherService
  ) {
    effect(async () => {
      const royalties = this.royalties();

      const uniqueAuthorIds = Array.from(
        new Set(
          royalties
            ?.map((r) => r.authorId)
            .filter((id): id is number => id !== null && id !== undefined)
        )
      );
      const uniquePublisherIds = Array.from(
        new Set(
          royalties
            ?.map((r) => r.publisherId)
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
      royalties?.forEach(async (royalty) => {
        const authorId = royalty.authorId ?? null;
        const publisherId = royalty.publisherId ?? null;
        const titleId = royalty.titleId ?? null;
        const key = `${authorId ?? 'null'}-${publisherId ?? 'null'}-${titleId}`;
        // if (!grouped.has(key)) {
        //   grouped.set(key, {
        //     titleId: 0,
        //     title: royalty.titlename,
        //     authorId: royalty.authorId ?? null,
        //     author: authorId ? authorMap.get(authorId) ?? 'N/A' : 'N/A',
        //     publisher: publisherId
        //       ? publisherMap.get(publisherId) ?? 'N/A'
        //       : 'N/A',
        //     publisherId: royalty.publisherId ?? null,
        //     print_mah: null,
        //     print_third_party: null,
        //     prime: null,
        //     ebook_mah: null,
        //     ebook_third_party: null,
        //     name: null,
        //     totalEarnings:
        //       royalty.earnings && royalty.earnings.length
        //         ? royalty.earnings.reduce((acc, earning) => {
        //             return acc + earning.amount;
        //           }, 0)
        //         : 0,
        //   });
        // }

        const group = grouped.get(key)!;

        const channalMap: any = {
          PRINT_MAH: 'print_mah',
          PRINT_THIRD_PARTY: 'print_third_party',
          PRIME: 'prime',
          EBOOK_MAH: 'ebook_mah',
          EBOOK_THIRD_PARTY: 'ebook_third_party',
        };

        // const field = channalMap[royalty.channal];

        // if (field) {
        //   group[field] = royalty.percentage;
        // }
      });

      const groupedData = Array.from(grouped.entries()).map(
        ([key, royaltyGroup], index) => ({
          serial: index + 1,
          authorOrPublisherId:
            royaltyGroup.authorId ?? royaltyGroup.publisherId,
          ...royaltyGroup,
        })
      );

      this.dataSource.data = groupedData;
    });
  }
}
