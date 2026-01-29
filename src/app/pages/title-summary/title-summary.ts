import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TitleService } from '../titles/title-service';
import { Back } from '../../components/back/back';
import {
  CommonModule,
  CurrencyPipe,
  NgClass,
  UpperCasePipe,
} from '@angular/common';
import { CreatePlatformIdentifier, PlatForm, Title } from '../../interfaces';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SafeUrlPipe } from '../../pipes/safe-url-pipe';
import { StaticValuesService } from '../../services/static-values';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { Signal } from '@angular/core';
import Swal from 'sweetalert2';
import { RoyaltyService } from '../../services/royalty-service';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ApproveTitle } from 'src/app/components/approve-title/approve-title';
import { EditPlatformIdentifier } from 'src/app/components/edit-platform-identifier/edit-platform-identifier';
import { IsbnFormatPipe } from 'src/app/pipes/isbn-format-pipe';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MobileSection } from 'src/app/components/mobile-section/mobile-section';
import { PlatformService } from 'src/app/services/platform';

@Component({
  selector: 'app-title-summary',
  imports: [
    Back,
    UpperCasePipe,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    NgClass,
    CommonModule,
    SafeUrlPipe,
    CurrencyPipe,
    SharedModule,
    IsbnFormatPipe,
    MobileSection,
  ],
  templateUrl: './title-summary.html',
  styleUrl: './title-summary.css',
})
export class TitleSummary {
  titleId!: number;
  titleDetails = signal<Title | null>(null);
  loggedInUser!: Signal<User | null>;
  royaltyAmountsCache = signal<Map<string, number>>(new Map());
  selectedTabIndex = signal<number>(0);
  isMobile = signal(false);
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private titleService: TitleService,
    private staticValueService: StaticValuesService,
    private userService: UserService,
    private translateService: TranslateService,
    private matDialog: MatDialog,
    private royaltyService: RoyaltyService,
    private breakpointObserver: BreakpointObserver,
    private platformService: PlatformService
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(takeUntilDestroyed())
      .subscribe((result) => {
        this.isMobile.set(result.matches);
      });
  }
  async ngOnInit() {
    // Read tab index from query params
    await this.platformService.fetchPlatforms();
    this.route.queryParams.subscribe((params) => {
      const tabParam = params['tab'];
      if (tabParam !== undefined && tabParam !== null) {
        const tabIndex = Number(tabParam);
        // Validate tab index is a valid number and within reasonable bounds (0-10)
        if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < 10) {
          this.selectedTabIndex.set(tabIndex);
        }
      }
    });

    this.route.params.subscribe(({ titleId }) => {
      this.titleId = Number(titleId);
      this.fetchTitleDetails();
    });
  }

  onTabChange(index: number) {
    this.selectedTabIndex.set(index);
    // Update query params without reloading the page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index },
      queryParamsHandling: 'merge', // Preserve other query params if any
    });
  }

  async fetchTitleDetails() {
    const res = await this.titleService.getTitleById(this.titleId, true);
    this.titleDetails.set(res);
    await this.calculateAllRoyaltyAmounts();
  }

  async calculateAllRoyaltyAmounts() {
    const title = this.titleDetails();
    if (!title) return;

    const pricing = title.pricing ?? [];
    const royalties = title.royalties ?? [];
    const printing = title.printing?.[0];
    const printingPrice = printing ? Number(printing.printCost) || 0 : 0;
    const customPrintCost = printing ? Number(printing.customPrintCost) || 0 : 0;

    // Group royalties by platform
    const royaltiesByPlatform = new Map<string, any[]>();
    royalties.forEach((r: any) => {
      const platformName =
        typeof r.platform === 'string' ? r.platform : r.platform?.name || null;
      if (platformName) {
        if (!royaltiesByPlatform.has(platformName)) {
          royaltiesByPlatform.set(platformName, []);
        }
        royaltiesByPlatform.get(platformName)!.push(r);
      }
    });

    // Prepare items for API call - only include platforms with royalties
    const items = pricing
      .map((p: any) => {
        const platformRoyalties = royaltiesByPlatform.get(p.platform) || [];
        if (platformRoyalties.length === 0) return null;

        const percentages = platformRoyalties.map((r: any) =>
          String(r.percentage || 0)
        );
        const platformId = this.platformService.platforms().find(({ name }) => name === p.platform)?.id;
        return {
          platformId: platformId!,
          price: p.mrp || p.salesPrice || 0,
          division: percentages,
        };
      })
      .filter(
        (
          item
        ): item is { platformId: number; price: number; division: string[] } =>
          item !== null
      );

    if (items.length === 0) {
      this.royaltyAmountsCache.set(new Map());
      return;
    }

    try {
      const response = await this.royaltyService.calculateRoyalties({
        items,
        printingPrice: customPrintCost || printingPrice,
      });

      // Cache the results
      const cache = new Map<string, number>();
      response.divisionValue.forEach((item) => {
        const platformName = this.platformService.platforms().find(({ id }) => id === item.platformId)?.name;
        const platformRoyalties = royaltiesByPlatform.get(platformName!) || [];
        platformRoyalties.forEach((r: any) => {
          const percentage = String(r.percentage || 0);
          const amount = item.divisionValue[percentage] || 0;
          const key = `${platformName}_${
            r.authorId || r.publisherId
          }_${percentage}`;
          cache.set(key, amount);
        });
      });

      // Also handle publisher margin for print platforms
      if (printing && printing.customPrintCost) {
        const customPrintCost = Number(printing.customPrintCost);
        const actualPrintCost = Number(printing.printCost) || 0;
        if (customPrintCost > actualPrintCost) {
          const margin = customPrintCost - actualPrintCost;
          // Add margin to publisher royalties for print platforms
          pricing.forEach((p: any) => {
            const platformRoyalties = royaltiesByPlatform.get(p.platform) || [];
            platformRoyalties
              .filter((r: any) => r.publisherId)
              .forEach((r: any) => {
                const percentage = String(r.percentage || 0);
                const key = `${p.platform}_${r.publisherId}_${percentage}`;
                const existingAmount = cache.get(key) || 0;
                // Check if it's a print platform (not ebook)
                const ebookPlatforms = ['MAH_EBOOK', 'KINDLE', 'GOOGLE_PLAY'];
                if (!ebookPlatforms.includes(p.platform)) {
                  cache.set(key, existingAmount + margin);
                }
              });
          });
        }
      }

      this.royaltyAmountsCache.set(cache);
    } catch (error) {
      console.error('Error calculating royalty amounts:', error);
    }
  }

  getAuthorCopyPrice(): number | null {
    const printing = this.titleDetails()?.printing?.[0] as any;
    if (!printing) return null;

    const rawPrice =
      printing.customPrintCost !== null &&
      printing.customPrintCost !== undefined
        ? Number(printing.customPrintCost)
        : printing.printCost !== null && printing.printCost !== undefined
        ? Number(printing.printCost)
        : null;

    if (rawPrice === null || isNaN(rawPrice)) {
      return null;
    }

    return rawPrice;
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

  platformsWithData = computed(() => {
    const pricing = this.titleDetails()?.pricing ?? [];
    const royalties = this.titleDetails()?.royalties ?? [];

    // Get unique platforms from pricing data (platform is a string)
    const platformsFromPricing = new Set(
      pricing.map((p: any) => p.platform).filter(Boolean)
    );

    // Get unique platforms from royalties data (platform is an object with name property)
    const platformsFromRoyalties = new Set(
      royalties
        .map((r: any) => {
          // Handle both cases: platform as string or platform as object with name
          if (typeof r.platform === 'string') {
            return r.platform;
          } else if (
            r.platform &&
            typeof r.platform === 'object' &&
            r.platform.name
          ) {
            return r.platform.name;
          }
          return null;
        })
        .filter((p: any) => p !== null && p !== undefined)
    );

    // Combine both sets and convert to array
    const allPlatformsWithData = new Set([
      ...Array.from(platformsFromPricing),
      ...Array.from(platformsFromRoyalties),
    ]);

    return Array.from(allPlatformsWithData) as PlatForm[];
  });
  getRoyaltyByPlatform(platform: PlatForm) {
    const royalties = this.titleDetails()?.royalties ?? [];
    return royalties.filter((r: any) => {
      // Handle both cases: platform as string or platform as object with name
      if (typeof r.platform === 'string') {
        return r.platform === platform;
      } else if (
        r.platform &&
        typeof r.platform === 'object' &&
        r.platform.name
      ) {
        return r.platform.name === platform;
      }
      return false;
    });
  }

  getPublisherRoyalty(platform: PlatForm): any | null {
    return this.getRoyaltyByPlatform(platform).find((r) => r.publisherId);
  }

  getAuthorRoyalties(platform: PlatForm): any[] {
    return this.getRoyaltyByPlatform(platform).filter((r) => r.authorId);
  }

  getAuthorRoyaltyOnly(platform: PlatForm): number {
    const author = this.getAuthorRoyalties(platform)?.find(
      (a) => a.authorId === this.loggedInUser()?.auther?.id
    );
    return author?.percentage ?? 0;
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
  getRoyaltyAmount(
    platform: PlatForm,
    percentage: number,
    isPublisher: boolean = false,
    authorId?: number | null,
    publisherId?: number | null
  ): number {
    // Get from cache if available
    const cache = this.royaltyAmountsCache();
    const id = isPublisher ? publisherId : authorId;
    if (id) {
      // Use String() to ensure consistent format matching the cache key
      const key = `${platform}_${id}_${String(percentage)}`;
      const cachedAmount = cache.get(key);
      if (cachedAmount !== undefined) {
        return cachedAmount;
      }
    }

    // Fallback to 0 if not in cache (calculation might still be in progress)
    return 0;
  }

  getPublisherMargin(platform: PlatForm): number {
    // Ebook platforms don't have printing costs, so no margin
    const ebookPlatforms: PlatForm[] = [
      PlatForm.MAH_EBOOK,
      PlatForm.KINDLE,
      PlatForm.GOOGLE_PLAY,
    ];
    const isEbookPlatform = ebookPlatforms.includes(platform);
    if (isEbookPlatform) {
      return 0;
    }

    const printing = this.titleDetails()?.printing?.[0];
    if (!printing) return 0;

    const actualPrintCost = Number(printing.printCost) || 0;
    const customPrintCost = printing.customPrintCost
      ? Number(printing.customPrintCost)
      : null;

    if (customPrintCost && customPrintCost > actualPrintCost) {
      return customPrintCost - actualPrintCost;
    }

    return 0;
  }

  async copyDistributionLink(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      Swal.fire({
        icon: 'success',
        title: 'Copied!',
        text: 'Distribution link copied to clipboard',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to copy link to clipboard',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    }
  }
  async addPlatformIdentifier() {
    const title = this.titleDetails();
    if (!title) return;

    const dialog = this.matDialog.open(ApproveTitle, {
      maxWidth: '95vw',
      width: '90vw',
      height: '90vh',
      maxHeight: '90vh',
      data: {
        onClose: () => dialog.close(),
        publishingType: title.publishingType,
        existingIdentifiers: (title.titlePlatformIdentifier ?? []).map(
          (tpi) => ({
            platformName: tpi.platform?.name || '',
            type:
              tpi.type ||
              ((tpi.platform?.isEbookPlatform ? 'EBOOK' : 'PRINT') as
                | 'EBOOK'
                | 'PRINT'),
            distributionLink: tpi.distributionLink || undefined,
          })
        ),
        distribution: title.distribution ?? [],
        isEditMode: true,
        skuNumber: title.skuNumber ?? undefined,
        onSubmit: async (data: {
          skuNumber?: string;
          platformIdentifier: CreatePlatformIdentifier[];
        }) => {
          try {
            // Use updateTitleSkuAndLinks endpoint which updates SKU and links without approval logic
            const response = await this.titleService.updateTitleSkuAndLinks(
              title.id,
              {
                skuNumber: data.skuNumber,
                platformIdentifier: data.platformIdentifier,
              }
            );

            this.titleDetails.set(response as Title);

            dialog.close();
          } catch (error) {
            console.log(error);
          }
        },
      },
    });
  }

  async onClickCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({
        icon: 'success',
        title: 'Copied!',
        text: 'HTML copied to clipboard',
        timer: 2000,
        position: 'bottom-end',
        showConfirmButton: false,
        toast: true,
      });
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }

  openDistributionLink(url: string) {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  editPlatformIdentifier(pid: any) {
    const title = this.titleDetails();
    if (!title) return;

    const dialog = this.matDialog.open(EditPlatformIdentifier, {
      width: '500px',
      maxWidth: '90vw',
      data: {
        onClose: () => dialog.close(),
        platformName: pid.platform.name,
        distributionLink: pid.distributionLink,
        onSubmit: async (data: { distributionLink?: string }) => {
          try {
            // Update distribution link for this specific platform
            if (
              data.distributionLink !== undefined &&
              data.distributionLink !== pid.distributionLink
            ) {
              const platformPayload = {
                platformIdentifier: [
                  {
                    platformName: pid.platform.name,
                    type:
                      pid.type ||
                      (pid.platform.isEbookPlatform ? 'EBOOK' : 'PRINT'),
                    distributionLink: data.distributionLink,
                  },
                ],
              };

              await this.titleService.createUpdateTitlePlatformIdentifier(
                title.id,
                platformPayload
              );
            }

            // Refresh title details
            await this.fetchTitleDetails();

            Swal.fire({
              icon: 'success',
              title: this.translateService.instant('success'),
              text:
                this.translateService.instant('updatedsuccessfully') ||
                'Updated successfully',
              timer: 2000,
              showConfirmButton: false,
              toast: true,
              position: 'top-end',
            });

            dialog.close();
          } catch (error: any) {
            console.error('Error updating:', error);
            Swal.fire({
              icon: 'error',
              title: this.translateService.instant('error'),
              text:
                error?.error?.message ||
                this.translateService.instant('updatefailed') ||
                'Update failed',
              timer: 3000,
              showConfirmButton: false,
              toast: true,
              position: 'top-end',
            });
          }
        },
      },
    });
  }

  getRandomColor(seed: string): string {
    // Generate a consistent color based on the platform name
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate a color with good contrast
    const hue = Math.abs(hash % 360);
    const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
    const lightness = 45 + (Math.abs(hash) % 15); // 45-60%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  handleImageError(event: Event, platformName: string) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  hasValidIcon(icon?: string): boolean {
    return !!icon && icon.trim().length > 0;
  }

  downloadAllMedia() {
    const mediaList = this.titleDetails()?.media;
    const titleName = this.titleDetails()?.name ?? 'titlemedia';

    if (!mediaList || !mediaList.length) {
      Swal.fire('No media found to download.');
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder(titleName.replace(/\s+/g, '_'))!;

    const fetchPromises = mediaList.map(async (media: any) => {
      try {
        const response = await fetch(media.url);
        const blob = await response.blob();

        // create readable file name
        const ext = media.url.split('.').pop().split('?')[0];
        const fileName = `${media.type.replace('_', '-')}.${ext}`;

        folder.file(fileName, blob);
      } catch (err) {
        console.error('Error loading file:', media.url, err);
      }
    });

    Promise.all(fetchPromises).then(() => {
      zip.generateAsync({ type: 'blob' }).then((content) => {
        saveAs(content, `${titleName.replace(/\s+/g, '_')}.zip`);
      });
    });
  }
}
