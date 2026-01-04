import { Component, signal } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { DecimalPipe } from '@angular/common';
import { AuthorsService } from '../../pages/authors/authors-service';
import { Author, AuthorFilter, AuthorStatus } from '../../interfaces';
import { formatDate, subDays } from 'date-fns';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-recent-authors',
  imports: [SharedModule, MatIconModule],
  templateUrl: './recent-authors.html',
  styleUrl: './recent-authors.css',
})
export class RecentAuthors {
  constructor(private authorService: AuthorsService) {}

  authors = signal<Author[] | null>(null);

  filter: AuthorFilter = {
    status: AuthorStatus.Active,
    showTotalEarnings: true,
    approvedAfter: formatDate(subDays(new Date(), 30), 'yyyy-MM-dd'),
    itemsPerPage: 5,
  };

  async ngOnInit() {
    const { items } = await this.authorService.getAuthors(this.filter);
    this.authors.update((authors) =>
      authors && authors.length ? [...authors, ...items] : items
    );
  }
}
