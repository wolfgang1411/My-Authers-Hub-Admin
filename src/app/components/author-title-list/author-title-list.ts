import { Component, Input, signal } from '@angular/core';
import { Author, Title } from '../../interfaces';
import { TitleService } from '../../pages/titles/title-service';
import { MatIconModule } from '@angular/material/icon';
import { AuthorsService } from '../../pages/authors/authors-service';
import { RouterLink } from '@angular/router';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { DecimalPipe } from '@angular/common';
import { IsbnFormat } from 'src/app/directives/isbn-format';
import { IsbnFormatPipe } from 'src/app/pipes/isbn-format-pipe';

@Component({
  selector: 'app-author-title-list',
  imports: [
    MatIconModule,
    RouterLink,
    MatIconButton,
    MatButtonModule,
    DecimalPipe,
    IsbnFormatPipe,
  ],
  templateUrl: './author-title-list.html',
  styleUrl: './author-title-list.css',
})
export class AuthorTitleList {
  titles = signal<Title[]>([]);
  author = signal<Author | null>(null);
  loading = signal(true);
  @Input({ required: true }) authorId!: number;

  constructor(
    private titleService: TitleService,
    private authorService: AuthorsService
  ) {}

  ngOnInit() {
    this.titleService
      .getTitles({ authorIds: this.authorId })
      .then(({ items }) => {
        this.titles.set(items);
        this.loading.set(false);
      });
    this.authorService.getAuthorrById(this.authorId).then((author) => {
      this.author.set(author);
    });
  }
}
