import { Component, computed, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { StaticValuesService } from '../../../services/static-values';
import { SharedModule } from '../../../modules/shared/shared-module';

@Component({
  selector: 'app-footer',
  imports: [MatIconModule, RouterModule, SharedModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer implements OnInit {
  currentYear = new Date().getFullYear();

  constructor(private staticValuesService: StaticValuesService) {}

  companyFacebookUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_FACEBOOK_URL || '';
  });

  companyInstagramUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_INSTAGRAM_URL || '';
  });

  companyLinkedinUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_LINKEDIN_URL || '';
  });

  companyTwitterUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_TWITTER_URL || '';
  });

  companyYoutubeUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_YOUTUBE_URL || '';
  });

  companyTiktokUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_TIKTOK_URL || '';
  });

  companyPinterestUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_PINTEREST_URL || '';
  });

  companyRedditUrl = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_REDDIT_URL || '';
  });

  hasSocialMedia = computed(() => {
    return (
      (this.companyFacebookUrl() && this.companyFacebookUrl().length > 0) ||
      (this.companyInstagramUrl() && this.companyInstagramUrl().length > 0) ||
      (this.companyLinkedinUrl() && this.companyLinkedinUrl().length > 0) ||
      (this.companyTwitterUrl() && this.companyTwitterUrl().length > 0) ||
      (this.companyYoutubeUrl() && this.companyYoutubeUrl().length > 0) ||
      (this.companyTiktokUrl() && this.companyTiktokUrl().length > 0) ||
      (this.companyPinterestUrl() && this.companyPinterestUrl().length > 0) ||
      (this.companyRedditUrl() && this.companyRedditUrl().length > 0)
    );
  });

  async ngOnInit() {
    // Fetch static values if not already loaded
    if (!this.staticValuesService.staticValues()) {
      await this.staticValuesService.fetchAndUpdateStaticValues();
    }
  }
}
