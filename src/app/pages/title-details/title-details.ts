import { Component, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Back } from '../../components/back/back';
import { TitleService } from '../titles/title-service';
import { Title, TitleFilter, TitleStepProgress } from '../../interfaces';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import { IsbnFormatPipe } from 'src/app/pipes/isbn-format-pipe';

@Component({
  selector: 'app-title-details',
  imports: [
    MatProgressBarModule,
    MatIconModule,
    Back,
    UpperCasePipe,
    MatButtonModule,
    MatStepperModule,
    RouterLink,
    SharedModule,
    CommonModule,
    MatIconModule,
    MatIconButton,
    IsbnFormatPipe,
  ],
  templateUrl: './title-details.html',
  styleUrl: './title-details.css',
})
export class TitleDetails {
  constructor(private titleService: TitleService) {}
  titles = signal<Title[]>([]);
  titleDetailsMap = signal<{ [id: number]: Title }>({});
  filter: TitleFilter = {
    page: 1,
    itemsPerPage: 30,
    status: 'ALL' as any,
  };
  ngOnInit(): void {
    this.fetchTitleList();
  }
  stepKeys = [
    'bookDetails',
    'uploadDocuments',
    'printDetails',
    'pricing',
    'royalty',
    'distribution',
  ] as const;

  getCurrentStepIndex(steps: TitleStepProgress | null | undefined): number {
    if (!steps) return 0;
    for (let i = 0; i < this.stepKeys.length; i++) {
      const key = this.stepKeys[i];
      if (!steps[key]) return i;
    }
    return this.stepKeys.length - 1;
  }
  getNextStepRoute(title: any, steps?: TitleStepProgress): string {
    if (!steps) {
      return 'details';
    }

    const stepIndex = this.getCurrentStepIndex(steps);
    const publishingType =
      title?.publishingType || title?.details?.publishingType;

    if (stepIndex === -1) return 'complete';

    switch (stepIndex) {
      case 0:
        return 'details';
      case 1:
        return 'documents';
      case 2:
        return publishingType === 'ONLY_EBOOK' ? 'pricing' : 'print';
      case 3:
        return 'pricing';
      case 4:
        return 'royalty';
      case 5:
        return 'distribution';
      default:
        return 'details';
    }
  }

  fetchTitleList() {
    this.titleService
      .getTitles()
      .then(({ items }) => {
        const sorted = items.sort((a, b) => {
          const order = ['DRAFT', 'PENDING', 'APPROVED'];
          return order.indexOf(a.status) - order.indexOf(b.status);
        });
        this.titles.set(sorted);
        console.log('Fetched & sorted titles:', this.titles());
      })
      .catch((error) => {
        console.error('Error fetching titles:', error);
      });
  }
  draftTitles = computed(() =>
    this.titles().filter((t) => t.status === 'DRAFT')
  );

  loadDraftTitleDetails() {
    const drafts = this.draftTitles();
    drafts.forEach((t) => {
      this.titleService.getTitleById(t.id).then((details) => {
        this.titleDetailsMap.update((prev) => ({
          ...prev,
          [t.id]: details,
        }));
      });
    });
  }
  titleStepProgress: any = computed(() => {
    const map: { [id: string]: TitleStepProgress } = {};
    const detailsMap = this.titleDetailsMap();

    for (const [id, details] of Object.entries(detailsMap)) {
      if (!details) continue;
      const bookDetails = !!details.id;
      const requiredMediaTypes = [
        'FRONT_COVER',
        'FULL_COVER',
        'INTERIOR',
        'INSIDE_COVER',
      ];
      // Add MANUSCRIPT for ebook types
      if (
        details.publishingType === 'ONLY_EBOOK' ||
        details.publishingType === 'PRINT_EBOOK'
      ) {
        requiredMediaTypes.push('MANUSCRIPT');
      }
      const media = details.media || [];
      const availableMediaTypes = media.map((m: any) => m.type);
      const hasAllRequiredMedia = requiredMediaTypes.every((type) =>
        availableMediaTypes.includes(type)
      );
      const uploadDocuments = hasAllRequiredMedia;
      let printDetails = false;
      if (details.publishingType === 'ONLY_EBOOK') {
        printDetails = true;
      } else {
        printDetails =
          Array.isArray(details.printing) && details.printing.length > 0;
      }
      const pricing =
        Array.isArray(details.pricing) && details.pricing.length > 0;
      const royalty =
        Array.isArray(details.royalties) && details.royalties.length > 0;
      const distribution =
        Array.isArray(details.distribution) && details.distribution.length > 0;
      map[id] = {
        bookDetails,
        uploadDocuments,
        printDetails,
        pricing,
        royalty,
        distribution,
      };
    }

    return map;
  });

  getFrontCoverUrl(title: Title): string | null {
    const media = title?.media || [];
    const frontCover = media.find((m: any) => m.type === 'FRONT_COVER');
    return frontCover ? frontCover.url : null;
  }
  pendingTitles = computed(() =>
    this.titles().filter((t) => t.status === 'PENDING')
  );
  deleteTitle(titleId: number) {}
}
