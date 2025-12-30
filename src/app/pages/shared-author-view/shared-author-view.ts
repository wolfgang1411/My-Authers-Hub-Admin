import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthorsService } from '../authors/authors-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SafeUrlPipe } from '../../pipes/safe-url-pipe';
import { CommonModule } from '@angular/common';
import { Back } from '../../components/back/back';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { Signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { SharedAuthorProfile } from '../../interfaces/Authors';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: 'app-shared-author-view',
  imports: [
    Back,
    SharedModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    CommonModule,
    SafeUrlPipe,
    AngularSvgIconModule,
  ],
  templateUrl: './shared-author-view.html',
  styleUrl: './shared-author-view.css',
})
export class SharedAuthorView implements OnInit {
  id!: number;
  authorData = signal<SharedAuthorProfile | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  loggedInUser!: Signal<User | null>;
  isLoggedIn = computed(() => !!this.loggedInUser());

  constructor(
    private route: ActivatedRoute,
    private authorsService: AuthorsService,
    private userService: UserService,
    private authService: AuthService
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  ngOnInit() {
    this.route.params.subscribe(({ id }) => {
      this.id = Number(id);
      this.fetchProfile();
    });
  }

  async fetchProfile() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      const data = await this.authorsService.getSharedProfile(this.id);
      this.authorData.set(data);
    } catch (error: any) {
      console.error('Error fetching shared author profile:', error);
      this.error.set(
        error?.error?.message || 'Failed to load shared author profile'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  getProfileImageUrl(): string | null {
    const medias = this.authorData()?.medias || [];
    return medias.length > 0 ? medias[0].url : null;
  }

  getPlatformIconUrl(
    platformIcon?: string,
    platformName?: string
  ): string | null {
    // If platform has an icon URL, use it
    if (platformIcon && platformIcon.trim().length > 0) {
      return platformIcon;
    }
    // Otherwise use jsdelivr CDN for Simple Icons (real brand icons)
    const name = (platformName || '').toUpperCase();
    if (name === 'AMAZON' || name === 'AMAZON_PRIME') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazon.svg';
    } else if (name === 'FLIPKART') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/flipkart.svg';
    } else if (name === 'KINDLE') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/amazon.svg'; // Use amazon icon for kindle
    } else if (name === 'GOOGLE_PLAY') {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googleplay.svg';
    } else if (name === 'MAH_PRINT' || name === 'MAH_EBOOK') {
      return null; // Will use fallback Material icon
    } else {
      return null; // Will use fallback Material icon
    }
  }

  hasPlatformIconUrl(platformIcon?: string, platformName?: string): boolean {
    return !!this.getPlatformIconUrl(platformIcon, platformName);
  }

  getPlatformIcon(platformName?: string): string {
    // Fallback Material icon if no brand icon available
    const name = (platformName || '').toUpperCase();
    if (name === 'MAH_PRINT' || name === 'MAH_EBOOK') {
      return 'store';
    }
    return 'store';
  }

  getSocialMediaIconUrl(type: string): string | null {
    const typeUpper = type.toUpperCase();
    // Use jsdelivr CDN for Simple Icons (real brand icons)
    if (typeUpper.includes('FACEBOOK')) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/facebook.svg';
    } else if (typeUpper.includes('TWITTER') || typeUpper.includes('X')) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg';
    } else if (typeUpper.includes('INSTAGRAM')) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg';
    } else if (typeUpper.includes('LINKEDIN')) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/linkedin.svg';
    } else if (typeUpper.includes('YOUTUBE')) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/youtube.svg';
    } else if (typeUpper.includes('TIKTOK')) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/tiktok.svg';
    } else if (typeUpper.includes('PINTEREST')) {
      return 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/pinterest.svg';
    } else if (typeUpper.includes('WEBSITE')) {
      return null; // Will use fallback Material icon
    }
    return null;
  }

  hasSocialMediaIconUrl(type: string): boolean {
    return !!this.getSocialMediaIconUrl(type);
  }

  getSocialMediaLabel(type: string): string {
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('FACEBOOK')) {
      return 'Facebook';
    } else if (typeUpper.includes('TWITTER') || typeUpper.includes('X')) {
      return 'Twitter/X';
    } else if (typeUpper.includes('INSTAGRAM')) {
      return 'Instagram';
    } else if (typeUpper.includes('LINKEDIN')) {
      return 'LinkedIn';
    } else if (typeUpper.includes('YOUTUBE')) {
      return 'YouTube';
    } else if (typeUpper.includes('TIKTOK')) {
      return 'TikTok';
    } else if (typeUpper.includes('PINTEREST')) {
      return 'Pinterest';
    } else if (typeUpper.includes('WEBSITE')) {
      return 'Website';
    }
    return type.replace('_', ' ');
  }
}
