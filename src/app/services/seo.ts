import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { SEOData, OpenGraphData, TwitterCardData, StructuredData } from '../interfaces/SEO';

@Injectable({ providedIn: 'root' })
export class SEOService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT) as Document;
  private readonly translateService = inject(TranslateService);

  private readonly defaultTitle = 'My Authors Hub';
  private readonly defaultDescription = 'Manage your publishing platform';
  private readonly defaultSiteName = 'My Authors Hub';
  private readonly baseUrl = this.getBaseUrl();

  /**
   * Get base URL from document
   */
  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return '';
  }

  /**
   * Set page title
   */
  setTitle(title: string): void {
    const fullTitle = title ? `${title} - ${this.defaultSiteName}` : this.defaultTitle;
    this.titleService.setTitle(fullTitle);
  }

  /**
   * Set meta description
   */
  setMetaDescription(description: string): void {
    if (description) {
      this.metaService.updateTag({ name: 'description', content: description });
    } else {
      this.metaService.removeTag("name='description'");
    }
  }

  /**
   * Set meta keywords
   */
  setMetaKeywords(keywords: string[]): void {
    if (keywords && keywords.length > 0) {
      this.metaService.updateTag({ name: 'keywords', content: keywords.join(', ') });
    } else {
      this.metaService.removeTag("name='keywords'");
    }
  }

  /**
   * Set Open Graph tags
   */
  setOpenGraphTags(data: OpenGraphData): void {
    if (data.title) {
      this.metaService.updateTag({ property: 'og:title', content: data.title });
    }
    if (data.description) {
      this.metaService.updateTag({ property: 'og:description', content: data.description });
    }
    if (data.image) {
      this.metaService.updateTag({ property: 'og:image', content: data.image });
    }
    if (data.url) {
      this.metaService.updateTag({ property: 'og:url', content: data.url });
    }
    if (data.type) {
      this.metaService.updateTag({ property: 'og:type', content: data.type });
    }
    this.metaService.updateTag({ property: 'og:site_name', content: this.defaultSiteName });
  }

  /**
   * Set Twitter Card tags
   */
  setTwitterCardTags(data: TwitterCardData): void {
    if (data.card) {
      this.metaService.updateTag({ name: 'twitter:card', content: data.card });
    }
    if (data.title) {
      this.metaService.updateTag({ name: 'twitter:title', content: data.title });
    }
    if (data.description) {
      this.metaService.updateTag({ name: 'twitter:description', content: data.description });
    }
    if (data.image) {
      this.metaService.updateTag({ name: 'twitter:image', content: data.image });
    }
    if (data.site) {
      this.metaService.updateTag({ name: 'twitter:site', content: data.site });
    }
    if (data.creator) {
      this.metaService.updateTag({ name: 'twitter:creator', content: data.creator });
    }
  }

  /**
   * Set canonical URL
   */
  setCanonicalUrl(url: string): void {
    let canonicalLink = this.document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = this.document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonicalLink);
    }
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    canonicalLink.setAttribute('href', fullUrl);
  }

  /**
   * Set robots meta tags
   */
  setRobotsMeta(noindex: boolean, nofollow: boolean): void {
    const content: string[] = [];
    if (noindex) {
      content.push('noindex');
    }
    if (nofollow) {
      content.push('nofollow');
    }
    if (content.length > 0) {
      this.metaService.updateTag({ name: 'robots', content: content.join(', ') });
    } else {
      this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
    }
  }

  /**
   * Set structured data (JSON-LD)
   */
  setStructuredData(data: StructuredData): void {
    // Remove existing structured data script
    const existingScript = this.document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    if (data && Object.keys(data).length > 0) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(data);
      this.document.head.appendChild(script);
    }
  }

  /**
   * Update page SEO with comprehensive data
   */
  updatePageSEO(seoData: SEOData): void {
    // Set title
    if (seoData.title) {
      this.setTitle(seoData.title);
    }

    // Set description
    if (seoData.description) {
      this.setMetaDescription(seoData.description);
    }

    // Set keywords
    if (seoData.keywords) {
      this.setMetaKeywords(seoData.keywords);
    }

    // Set Open Graph tags
    if (seoData.ogTitle || seoData.ogDescription || seoData.ogImage || seoData.ogUrl || seoData.ogType) {
      this.setOpenGraphTags({
        title: seoData.ogTitle || seoData.title,
        description: seoData.ogDescription || seoData.description,
        image: seoData.ogImage,
        url: seoData.ogUrl,
        type: seoData.ogType,
      });
    }

    // Set Twitter Card tags
    if (seoData.twitterCard || seoData.twitterTitle || seoData.twitterDescription || seoData.twitterImage) {
      this.setTwitterCardTags({
        card: seoData.twitterCard || 'summary_large_image',
        title: seoData.twitterTitle || seoData.title,
        description: seoData.twitterDescription || seoData.description,
        image: seoData.twitterImage || seoData.ogImage,
      });
    }

    // Set canonical URL
    if (seoData.canonicalUrl) {
      this.setCanonicalUrl(seoData.canonicalUrl);
    }

    // Set robots meta
    if (seoData.noindex !== undefined || seoData.nofollow !== undefined) {
      this.setRobotsMeta(
        seoData.noindex ?? false,
        seoData.nofollow ?? false
      );
    }

    // Set structured data
    if (seoData.structuredData) {
      this.setStructuredData(seoData.structuredData);
    }
  }

  /**
   * Clear all SEO data and reset to defaults
   */
  clearSEO(): void {
    this.setTitle(this.defaultTitle);
    this.setMetaDescription(this.defaultDescription);
    this.metaService.removeTag("name='keywords'");
    
    // Remove Open Graph tags
    ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'].forEach(property => {
      this.metaService.removeTag(`property='${property}'`);
    });

    // Remove Twitter Card tags
    ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:site', 'twitter:creator'].forEach(name => {
      this.metaService.removeTag(`name='${name}'`);
    });

    // Remove canonical link
    const canonicalLink = this.document.querySelector("link[rel='canonical']");
    if (canonicalLink) {
      canonicalLink.remove();
    }

    // Remove structured data
    const structuredDataScript = this.document.querySelector('script[type="application/ld+json"]');
    if (structuredDataScript) {
      structuredDataScript.remove();
    }

    // Reset robots
    this.setRobotsMeta(false, false);
  }

  /**
   * Get translated SEO data
   */
  getTranslatedSEO(key: string, fallback?: SEOData): SEOData {
    const translationKey = `seo.${key}`;
    const title = this.translateService.instant(`${translationKey}.title`) || fallback?.title;
    const description = this.translateService.instant(`${translationKey}.description`) || fallback?.description;

    return {
      title,
      description,
      keywords: fallback?.keywords,
      ogType: fallback?.ogType || 'website',
    };
  }
}

