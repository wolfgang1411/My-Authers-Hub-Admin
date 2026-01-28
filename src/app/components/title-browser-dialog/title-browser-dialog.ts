import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogTitle,
  MatDialogActions,
} from '@angular/material/dialog';
import { TitleService } from '../../pages/titles/title-service';
import { PlatformService } from '../../services/platform';
import { Title, TitleFilter, TitleStatus, PublishingType } from '../../interfaces';
import { Subject, debounceTime } from 'rxjs';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { PlatForm } from '../../interfaces';

export interface TitleBrowserDialogData {
  onAddToCart: (title: Title) => void;
  getTitlePrice: (title: Title) => number;
}

@Component({
  selector: 'app-title-browser-dialog',
  standalone: true,
  imports: [
    SharedModule,
    MatDialogContent,
    MatDialogTitle,
    MatDialogActions,
    MatButton,
    MatIconButton,
    MatIcon,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './title-browser-dialog.html',
  styleUrl: './title-browser-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleBrowserDialog implements OnInit {
  dialogRef = inject(MatDialogRef<TitleBrowserDialog>);
  data = inject<TitleBrowserDialogData>(MAT_DIALOG_DATA);
  titleService = inject(TitleService);
  platformService = inject(PlatformService);
  userService = inject(UserService);

  titles = signal<Title[]>([]);
  titleSearchStr = new Subject<string>();
  titleFilter = signal<TitleFilter>({
    page: 1,
    itemsPerPage: 20,
    searchStr: '',
    status: TitleStatus.APPROVED,
  });

  user = signal<User | null>(null);

  ngOnInit(): void {
    this.user.set(this.userService.loggedInUser$());
    if (this.user()?.accessLevel === 'AUTHER' && this.user()?.auther?.id) {
      this.titleFilter.update((f) => ({ ...f, authorCopyAllowedIds: this.user()?.auther?.id }));
    }
    this.searchTitles();

    this.titleSearchStr
      .pipe(debounceTime(400))
      .subscribe((value) => {
        this.titleFilter.update((f) => ({ ...f, searchStr: value, page: 1 }));
        // Use setTimeout to ensure signal update is processed
        setTimeout(() => this.searchTitles(), 0);
      });
  }

  async searchTitles() {
    try {
      const currentFilter = this.titleFilter();
      const filter: TitleFilter = {
        ...currentFilter,
        page: currentFilter.page || 1,
        itemsPerPage: currentFilter.itemsPerPage || 20,
        status: currentFilter.status || TitleStatus.APPROVED,
      };
      const user = this.user();
      
      // Filter titles by user role - authors and publishers should only see their own titles
      if (user?.accessLevel === 'AUTHER' && user.auther?.id) {
        // For authors, filter by authorIds (use auther.id, not user.id)
        filter.authorIds = user.auther.id;
      } else if (user?.accessLevel === 'PUBLISHER' && user.publisher?.id) {
        // For publishers, filter by publisherIds (use publisher.id, not user.id)
        filter.publisherIds = user.publisher.id;
      }
      // For SUPERADMIN, no filtering needed - they see all titles

      const response = await this.titleService.getTitles(filter);

      // Filter titles: exclude ebook-only titles (we only allow print orders)
      const filteredTitles = (response.items || []).filter((title) => {
        // Exclude ebook-only titles - we can't order print copies of these
        return title.publishingType !== PublishingType.ONLY_EBOOK;
      });
      
      console.log('Total titles fetched:', response.items?.length, 'After filtering:', filteredTitles.length);
      this.titles.set(filteredTitles);
    } catch (error) {
      console.error('Error searching titles:', error);
    }
  }

  onAddToCart(title: Title) {
    this.data.onAddToCart(title);
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }
}

