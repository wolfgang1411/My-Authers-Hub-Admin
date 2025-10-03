import { Component, signal } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { Title, TitleResponse } from '../../interfaces/Titles';
import { SharedModule } from '../../modules/shared/shared-module';
import { TitleService } from './title-service';
import { RouterLink } from '@angular/router';
import { ListTable } from '../../components/list-table/list-table';
import { MatTableDataSource } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-titles',
  imports: [
    SharedModule,
    RouterLink,
    ListTable,
    MatIcon,
    MatIconButton,
    MatButton,
  ],
  templateUrl: './titles.html',
  styleUrl: './titles.css',
})
export class Titles {
  constructor(private titleService: TitleService) {}
  searchStr = new Subject<string>();

  test!: Subject<string>;
  titles = signal<Title[]>([]);
  displayedColumns: string[] = [
    'serial',
    'title',
    'isbnPrint',
    'isbnEbook',
    'pages',
    'royaltiesearned',
    'authors',
    'publishedby',
    'actions',
  ];
  dataSource = new MatTableDataSource<TitleResponse>();

  ngOnInit(): void {
    this.searchStr.pipe(debounceTime(400)).subscribe((value) => {
      console.log('Search string:', value);
    });

    this.titleService
      .getTitles()
      .then(({ items }) => {
        this.titles.set(items);
        const mapped = items.map((title, idx) => ({
          serial: idx + 1,
          id: title.id,
          title: title.name,
          isbnPrint:
            title.isbnPrint && title.isbnPrint ? title.isbnPrint : 'N/A',
          isbnEbook:
            title.isbnEbook && title.isbnEbook ? title.isbnEbook : 'N/A',
          pages:
            title.printing && title.printing.length
              ? title.printing[0].totalPages
              : 'N/A',

          royaltiesearned: 0,
          // royaltiesearned:
          //   title.royalties && title.royalties.length
          //     ? title.royalties.reduce((acc, royalty) => {
          //         const sumForOne =
          //           (royalty.print_mah || 0) +
          //           (royalty.print_third_party || 0) +
          //           (royalty.prime || 0) +
          //           (royalty.ebook_mah || 0) +
          //           (royalty.ebook_third_party || 0);
          //         return acc + sumForOne;
          //       }, 0)
          //     : 0,
          authors:
            title.authors && title.authors.length
              ? title.authors.map((author) => author.author?.name).join(' ,')
              : 'N/A',
          publishedby: title.publisher ? title.publisher.name : 'N/A',
          actions: '',
        }));

        this.dataSource.data = mapped;
        if (mapped.length > 0) {
          this.displayedColumns = Object.keys(mapped[0]);
        }

        console.log('Fetched titles:', this.titles());
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }
}
