import { Component, computed, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { StaticValuesService } from '../../services/static-values';
import { SharedModule } from '../../modules/shared/shared-module';
import { Server } from '../../services/server';
import { Logger } from '../../services/logger';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterModule, MatIconModule, SharedModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact implements OnInit {
  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  constructor(
    private staticValuesService: StaticValuesService,
    private server: Server,
    private logger: Logger
  ) {}

  companyEmail = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_EMAIL || '';
  });

  companyPhone = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_PHONE || '';
  });

  companyAddress = computed(() => {
    const staticValues = this.staticValuesService.staticValues();
    return staticValues?.COMPANY_ADDRESS || '';
  });

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

  contactForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    subject: new FormControl('', [Validators.required]),
    message: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
  });

  async onSubmit() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const response = await this.server.post<{
        success: boolean;
        message: string;
      }>('contact', this.contactForm.value);

      const successMsg =
        response.message ||
        'Thank you for contacting us! We have received your message and will get back to you within 24 hours.';

      // Show success message in both SweetAlert and inline
      this.successMessage.set(successMsg);

      // Show prominent success notification
      Swal.fire({
        icon: 'success',
        title: 'Message Sent!',
        text: successMsg,
        confirmButtonColor: '#3b82f6',
        heightAuto: false,
      });

      // Clear form inputs after successful submission
      this.contactForm.reset();
    } catch (error: any) {
      this.logger.logError(error);
      this.errorMessage.set(
        error?.error?.message ||
          error?.message ||
          'Failed to send message. Please try again later.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
