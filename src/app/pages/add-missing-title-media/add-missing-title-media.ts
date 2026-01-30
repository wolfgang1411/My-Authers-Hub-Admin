import { Component, inject, OnInit, signal } from '@angular/core';
import { Title, TitleFilter } from 'src/app/interfaces';
import { TitleService } from '../titles/title-service';

@Component({
  selector: 'app-add-missing-title-media',
  imports: [],
  templateUrl: './add-missing-title-media.html',
  styleUrl: './add-missing-title-media.css',
})
export class AddMissingTitleMedia implements OnInit {
  titleService = inject(TitleService);

  titles = signal<Title[] | null>(null);

  filter: TitleFilter = {
    showMissingMediaTitleOnly: true,
    itemsPerPage: 30,
    page: 1,
  };
  ngOnInit(): void {
    this.fetchAndUpdateTitle();
  }

  async fetchAndUpdateTitle() {
    try {
      const { items } = await this.titleService.getTitleWithLessDetails(
        this.filter,
      );
      this.titles.update((titles) => {
        const d = titles || [];
        d.concat(items);
        return d;
      });
    } catch (error) {
      throw error;
    }
  }
}
