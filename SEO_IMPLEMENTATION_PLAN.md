# SEO Implementation Plan for My Authors Hub Admin

## Overview
This document outlines the comprehensive SEO strategy for the Angular application, including route-based titles, meta tags, and other SEO optimizations.

## 1. Core SEO Features

### 1.1 Route-Based Title Management
- **Location**: Set titles directly in route configuration
- **Implementation**: Add `title` property to each route in `app.routes.ts`
- **Format**: `title: string | (route: ActivatedRouteSnapshot) => string`
- **Default**: Fallback to app name if no title specified

### 1.2 Meta Tags Management
- **Description**: Page-specific meta descriptions
- **Keywords**: Relevant keywords for each page
- **Open Graph Tags**: For social media sharing
  - `og:title`
  - `og:description`
  - `og:image`
  - `og:url`
  - `og:type`
- **Twitter Card Tags**: For Twitter sharing
  - `twitter:card`
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`
- **Canonical URLs**: Prevent duplicate content issues

### 1.3 Structured Data (JSON-LD)
- Schema.org markup for:
  - Organization
  - WebSite
  - BreadcrumbList
  - Article (for blog/content pages)
  - Book (for title pages)

## 2. Implementation Structure

### 2.1 SEO Service (`services/seo.ts`)
**Responsibilities:**
- Manage page titles using Angular `Title` service
- Manage meta tags using Angular `Meta` service
- Update canonical URLs
- Inject structured data (JSON-LD)
- Handle dynamic content (e.g., title details, author details)

**Key Methods:**
- `setTitle(title: string)`
- `setMetaDescription(description: string)`
- `setMetaKeywords(keywords: string[])`
- `setOpenGraphTags(data: OpenGraphData)`
- `setTwitterCardTags(data: TwitterCardData)`
- `setCanonicalUrl(url: string)`
- `setStructuredData(data: StructuredData)`
- `updatePageSEO(seoData: SEOData)`
- `clearSEO()` - Reset to defaults

### 2.2 Route Configuration Interface
**Location**: `interfaces/route-seo.ts`

```typescript
export interface RouteSEOData {
  title: string | ((route: ActivatedRouteSnapshot) => string);
  description?: string | ((route: ActivatedRouteSnapshot) => string);
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'book' | 'profile';
  canonicalUrl?: string;
  noindex?: boolean; // For private/admin pages
  nofollow?: boolean;
}
```

### 2.3 Route Data Structure
Add SEO data to routes in `app.routes.ts`:
```typescript
{
  path: 'dashboard',
  loadComponent: () => import('./pages/dashboard/dashboard').then((c) => c.Dashboard),
  canActivate: [privateRouteGuard],
  data: {
    seo: {
      title: 'Dashboard',
      description: 'Manage your authors hub dashboard',
      noindex: true, // Private page
    }
  }
}
```

### 2.4 Dynamic SEO Updates
For pages with dynamic content (e.g., `/title/:titleId`):
- Component fetches data
- Component calls SEO service with dynamic data
- SEO service updates meta tags accordingly

## 3. Route-Specific SEO Configuration

### 3.1 Public Routes (SEO Optimized)
- `/login` - Login page
- `/forgot` - Forgot password
- `/forgot/verify` - Password verification
- `/user-policies` - User policies
- `/terms` - Terms and conditions
- `/contact` - Contact page
- `/faq` - FAQ page
- `/shared-title-view/:code` - Public title view
- `/shared/authors/:id` - Public author view
- `/shared/publishers/:id` - Public publisher view
- `/author/invite/:signupCode` - Author invite
- `/publisher/invite/:signupCode` - Publisher invite

### 3.2 Private Routes (No Index)
- All dashboard routes
- Admin routes
- User-specific routes
- Set `noindex: true` and `nofollow: true` for these

## 4. Additional SEO Features

### 4.1 robots.txt
**Location**: `public/robots.txt` or `src/robots.txt`
**Content**:
```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /login
Disallow: /author/
Disallow: /publisher/
Disallow: /title/
Disallow: /orders
Disallow: /transactions
Disallow: /bookings
Disallow: /payouts
Disallow: /profile
Disallow: /settings
Disallow: /users
Disallow: /notifications
Disallow: /invites

Sitemap: https://yourdomain.com/sitemap.xml
```

### 4.2 Sitemap.xml
**Location**: Generated dynamically or static file
**Include**:
- Public pages only
- Last modified dates
- Change frequency
- Priority

### 4.3 Structured Data (JSON-LD)
**Types to implement**:
1. **Organization Schema** (Homepage)
   - Name, logo, contact info, social profiles
2. **WebSite Schema** (Homepage)
   - Search action, potential actions
3. **BreadcrumbList** (All pages)
   - Navigation hierarchy
4. **Book Schema** (Title pages)
   - Title, author, ISBN, description, image
5. **Person Schema** (Author pages)
   - Name, description, image, sameAs (social links)
6. **Organization Schema** (Publisher pages)
   - Name, description, logo, contact info

### 4.4 Performance SEO
- Image optimization (already using NgOptimizedImage)
- Lazy loading
- Preconnect to external domains
- DNS prefetch for external resources

### 4.5 Internationalization (i18n) SEO
- `hreflang` tags for multi-language support
- Language-specific meta tags
- Canonical URLs per language

## 5. Implementation Steps

### Phase 1: Core Infrastructure
1. ✅ Create SEO service
2. ✅ Create route SEO interface
3. ✅ Update app.ts to use SEO service
4. ✅ Add SEO data to all routes

### Phase 2: Meta Tags
1. ✅ Implement basic meta tags (title, description)
2. ✅ Add Open Graph tags
3. ✅ Add Twitter Card tags
4. ✅ Add canonical URLs

### Phase 3: Dynamic Content
1. ✅ Update dynamic pages to set SEO on data load
2. ✅ Handle route parameters in SEO service
3. ✅ Add loading states for SEO updates

### Phase 4: Advanced Features
1. ⏳ Create robots.txt
2. ⏳ Generate sitemap.xml
3. ⏳ Add structured data (JSON-LD)
4. ⏳ Add breadcrumb schema

### Phase 5: Testing & Validation
1. ⏳ Test with Google Search Console
2. ⏳ Validate structured data
3. ⏳ Test social media sharing
4. ⏳ Verify canonical URLs

## 6. Translation Keys for SEO

Add to `public/i18n/en.json`:
```json
{
  "seo": {
    "defaultTitle": "My Authors Hub",
    "defaultDescription": "Manage your publishing platform",
    "dashboard": {
      "title": "Dashboard",
      "description": "Manage your authors hub dashboard"
    },
    "login": {
      "title": "Login - My Authors Hub",
      "description": "Login to your My Authors Hub account"
    },
    "contact": {
      "title": "Contact Us - My Authors Hub",
      "description": "Get in touch with My Authors Hub team"
    },
    "faq": {
      "title": "Frequently Asked Questions - My Authors Hub",
      "description": "Find answers to common questions about My Authors Hub"
    },
    "terms": {
      "title": "Terms and Conditions - My Authors Hub",
      "description": "Read our terms and conditions"
    },
    "userPolicies": {
      "title": "User Policies - My Authors Hub",
      "description": "Review our user policies and guidelines"
    }
  }
}
```

## 7. Example Route Configuration

```typescript
{
  path: 'contact',
  loadComponent: () => import('./pages/contact/contact').then((c) => c.Contact),
  data: {
    seo: {
      title: 'Contact Us - My Authors Hub',
      description: 'Get in touch with My Authors Hub team. We are here to help you with your publishing needs.',
      keywords: ['contact', 'support', 'help', 'publishing'],
      ogType: 'website',
      canonicalUrl: '/contact'
    }
  }
},
{
  path: 'shared-title-view/:code',
  loadComponent: () => import('./pages/shared-title-view/shared-title-view').then((c) => c.SharedTitleView),
  data: {
    seo: {
      title: (route) => {
        // Dynamic title will be set by component after data loads
        return 'Book Title - My Authors Hub';
      },
      description: (route) => {
        // Dynamic description will be set by component
        return 'View book details on My Authors Hub';
      },
      ogType: 'book',
      // Component will update with actual data
    }
  }
}
```

## 8. Component-Level SEO Updates

For components with dynamic content:

```typescript
export class SharedTitleView {
  private seoService = inject(SEOService);
  private route = inject(ActivatedRoute);
  
  ngOnInit() {
    // Load title data
    this.loadTitleData().then(title => {
      this.seoService.updatePageSEO({
        title: `${title.name} - My Authors Hub`,
        description: title.description || 'View book details',
        ogImage: title.coverImage,
        ogType: 'book',
        structuredData: {
          '@type': 'Book',
          name: title.name,
          author: title.author,
          isbn: title.isbn,
          image: title.coverImage,
        }
      });
    });
  }
}
```

## 9. Best Practices

1. **Always set titles** - Every route should have a title
2. **Unique descriptions** - Each page should have unique meta descriptions
3. **Relevant keywords** - Use relevant, natural keywords
4. **Image optimization** - Use optimized images for OG tags
5. **Canonical URLs** - Set canonical URLs to prevent duplicate content
6. **Noindex private pages** - All admin/dashboard pages should be noindex
7. **Structured data** - Add schema markup for rich snippets
8. **Mobile-friendly** - Ensure all pages are mobile-responsive
9. **Fast loading** - Optimize page load times
10. **Accessibility** - Ensure WCAG compliance

## 10. Monitoring & Maintenance

1. **Google Search Console** - Monitor indexing and search performance
2. **Google Analytics** - Track organic traffic
3. **Schema Validator** - Validate structured data
4. **Social Media Debuggers**:
   - Facebook Sharing Debugger
   - Twitter Card Validator
   - LinkedIn Post Inspector
5. **Regular audits** - Review and update SEO content quarterly

## 11. Next Steps

1. Implement SEO service
2. Add route configurations
3. Update components for dynamic SEO
4. Create robots.txt and sitemap
5. Add structured data
6. Test and validate
7. Deploy and monitor

