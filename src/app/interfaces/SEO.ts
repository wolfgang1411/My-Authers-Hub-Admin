import { ActivatedRouteSnapshot } from '@angular/router';

export interface RouteSEOData {
  title: string | ((route: ActivatedRouteSnapshot) => string);
  description?: string | ((route: ActivatedRouteSnapshot) => string);
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'book' | 'profile';
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: 'website' | 'article' | 'book' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: Record<string, unknown>;
}

export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'book' | 'profile';
  siteName?: string;
}

export interface TwitterCardData {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  title?: string;
  description?: string;
  image?: string;
  site?: string;
  creator?: string;
}

export interface StructuredData {
  '@context'?: string;
  '@type'?: string;
  [key: string]: unknown;
}

