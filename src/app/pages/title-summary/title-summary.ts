import {
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TitleService } from '../titles/title-service';
import { Back } from '../../components/back/back';
import {
  CommonModule,
  CurrencyPipe,
  NgClass,
  UpperCasePipe,
} from '@angular/common';
import { PlatForm, Title } from '../../interfaces';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { SafeUrlPipe } from '../../pipes/safe-url-pipe';
import { StaticValuesService } from '../../services/static-values';

@Component({
  selector: 'app-title-summary',
  imports: [
    Back,
    UpperCasePipe,
    MatTabsModule,
    MatIconModule,
    NgClass,
    CommonModule,
    SafeUrlPipe,
    CurrencyPipe,
  ],
  templateUrl: './title-summary.html',
  styleUrl: './title-summary.css',
})
export class TitleSummary {
  titleId!: number;
  titleDetails = signal<Title | null>(null);

  constructor(
    private route: ActivatedRoute,
    private titleService: TitleService,
    private staticValueService: StaticValuesService
  ) {}
  ngOnInit() {
    this.route.params.subscribe(({ titleId }) => {
      this.titleId = Number(titleId);
      this.fetchTitleDetails();
    });
  }

  fetchTitleDetails() {
    this.titleService.getTitleById(this.titleId).then((res) => {
      this.titleDetails.set(res);
    });
  }

  frontCoverUrl(): string | null {
    const media = this.titleDetails()?.media || [];
    const front = media.find((m: any) => m.type === 'FRONT_COVER');
    return front ? front.url : null;
  }
  platforms = computed(() => {
    return Object.keys(
      this.staticValueService.staticValues()?.PlatForm || {}
    ) as PlatForm[];
  });
  getRoyaltyByPlatform(platform: PlatForm) {
    const royalties = this.titleDetails()?.royalties ?? [];
    return royalties.filter((r) => r.platform === platform);
  }

  getPublisherRoyalty(platform: PlatForm): any | null {
    return this.getRoyaltyByPlatform(platform).find((r) => r.publisherId);
  }

  getAuthorRoyalties(platform: PlatForm): any[] {
    return this.getRoyaltyByPlatform(platform).filter((r) => r.authorId);
  }

  getAuthorName(authorId: number): string {
    const author = this.titleDetails()?.authors?.find(
      (a: any) => a.author?.id === authorId
    );
    if (!author) return 'Unknown Author';
    return `${author.author.user.firstName} ${author.author.user.lastName}`;
  }

  getPublisherName(): string {
    return this.titleDetails()?.publisher?.name || 'Publisher';
  }

  getTotalRoyalty(platform: PlatForm): number {
    const royalties = this.getRoyaltyByPlatform(platform);
    return royalties.reduce((sum, r) => sum + (r.percentage || 0), 0);
  }

  getPriceByPlatform(platform: PlatForm): any | null {
    const prices = this.titleDetails()?.pricing ?? [];
    return prices.find((p: any) => p.platform === platform) || null;
  }

  getMarginForPlatform(platform: PlatForm): string {
    const p = this.getPriceByPlatform(platform);
    if (!p || !p.mrp || !p.salesPrice) return 'N/A';
    const margin = 100 - (p.salesPrice / p.mrp) * 100;
    return margin.toFixed(1) + '%';
  }
  getRoyaltyAmount(platform: PlatForm, percentage: number): number {
    const price = this.getPriceByPlatform(platform);
    if (!price || !price.salesPrice) return 0;

    return (percentage / 100) * price.salesPrice;
  }
}
