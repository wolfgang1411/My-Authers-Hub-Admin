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
    'isbn',
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
<<<<<<< HEAD
=======
          id: title.id,
>>>>>>> 96459fd956b5a614b92771a3f157aa7941d236b5
          serial: idx + 1,
          title: title.name,
          isbn:
            title.isbn && title.isbn.isbnNumber ? title.isbn.isbnNumber : 'N/A',
          pages:
            title.printing && title.printing.length
              ? title.printing[0].totalPages
              : 'N/A',
          royaltiesearned:
            title.Royalty && title.Royalty.length
<<<<<<< HEAD
              ? title.Royalty.reduce((acc, royalty) => {
                  const sumForOne =
                    (royalty.print_mah || 0) +
                    (royalty.print_third_party || 0) +
                    (royalty.prime || 0) +
                    (royalty.ebook_mah || 0) +
                    (royalty.ebook_third_party || 0);
                  return acc + sumForOne;
                }, 0)
=======
              ? title.Royalty.reduce(
                  (acc, royalty) => acc + royalty.percentage,
                  0
                )
>>>>>>> 96459fd956b5a614b92771a3f157aa7941d236b5
              : 0,
          authors:
            title.authors && title.authors.length
              ? title.authors.map((author) => author.name).join(' ,')
              : 'N/A',
          publishedby: title.publisher ? title.publisher.name : 'N/A',
          actions: '',
        }));

        this.dataSource.data = mapped;
        this.displayedColumns = Object.keys(mapped[0]);
        console.log('Fetched titles:', this.titles());
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }
}
