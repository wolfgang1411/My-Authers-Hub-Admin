import { Routes } from '@angular/router';
import { privateRouteGuard } from './guards/private-route-guard';
import { publicRouteGuard } from './guards/public-route-guard';
import { AddAuthor } from './pages/add-author/add-author';
import { TitleFormTemp } from './pages/title-form-temp/title-form-temp';
import { AddPublisher } from './pages/add-publisher/add-publisher';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((c) => c.Dashboard),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Dashboard',
        description: 'Manage your authors hub dashboard',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((c) => c.Login),
    canActivate: [publicRouteGuard],
    data: {
      seo: {
        title: 'Login - My Authors Hub',
        description: 'Login to your My Authors Hub account to manage your publishing platform',
        keywords: ['login', 'sign in', 'authors hub', 'publishing'],
        ogType: 'website',
        canonicalUrl: '/login',
      },
    },
  },
  {
    path: 'publisher',
    loadComponent: () =>
      import('./pages/publisher/publisher').then((c) => c.Publisher),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Publishers',
        description: 'Manage publishers in your authors hub',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'author',
    loadComponent: () =>
      import('./pages/authors/authors').then((c) => c.Authors),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Authors',
        description: 'Manage authors in your authors hub',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'author/:id',
    component: AddAuthor,
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Edit Author',
        description: 'Edit author information',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'authorDetails/:id',
    loadComponent: () =>
      import('./pages/author-details/author-details').then(
        (c) => c.AuthorDetails
      ),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Author Details',
        description: 'View author details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'author/invite/:signupCode',
    loadComponent: () =>
      import('./pages/add-author/add-author').then((c) => c.AddAuthor),
    data: {
      seo: {
        title: 'Author Invitation - My Authors Hub',
        description: 'Join My Authors Hub as an author',
        keywords: ['author', 'invitation', 'signup', 'publishing'],
        ogType: 'website',
      },
    },
  },
  {
    path: 'title/:titleId',
    component: TitleFormTemp,
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Edit Title',
        description: 'Edit book title information',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'title-update-tickets',
    loadComponent: () =>
      import('./pages/update-title-ticket/update-title-ticket').then(
        (c) => c.UpdateTitleTicket
      ),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Title Update Tickets',
        description: 'Manage title update tickets',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'update-tickets',
    loadComponent: () =>
      import('./pages/update-ticket-list/update-ticket-list').then(
        (c) => c.UpdateTicketList
      ),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Update Tickets',
        description: 'View and manage update tickets',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'titles',
    loadComponent: () => import('./pages/titles/titles').then((c) => c.Titles),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Titles',
        description: 'Manage book titles in your authors hub',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'titleDetails',
    loadComponent: () =>
      import('./pages/title-details/title-details').then((c) => c.TitleDetails),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Title Details',
        description: 'View title details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'titleSummary/:titleId',
    loadComponent: () =>
      import('./pages/title-summary/title-summary').then((c) => c.TitleSummary),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Title Summary',
        description: 'View title summary and overview',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'wallet',
    loadComponent: () => import('./pages/wallet/wallet').then((c) => c.Wallet),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Wallet',
        description: 'Manage your wallet and earnings',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'isbn',
    loadComponent: () =>
      import('./pages/isbn-list/isbn-list').then((c) => c.ISBNList),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'ISBN List',
        description: 'Manage ISBN numbers for your books',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'royalties',
    loadComponent: () =>
      import('./pages/royalties/royalties').then((c) => c.Royalties),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Royalties',
        description: 'View and manage your royalties',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'publisherDetails/:id',
    loadComponent: () =>
      import('./pages/publisher-details/publisher-details').then(
        (c) => c.PublisherDetails
      ),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Publisher Details',
        description: 'View publisher details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'publisher/:id',
    component: AddPublisher,
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Edit Publisher',
        description: 'Edit publisher information',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'publisher/invite/:signupCode',
    loadComponent: () =>
      import('./pages/add-publisher/add-publisher').then((C) => C.AddPublisher),
    data: {
      seo: {
        title: 'Publisher Invitation - My Authors Hub',
        description: 'Join My Authors Hub as a publisher',
        keywords: ['publisher', 'invitation', 'signup', 'publishing'],
        ogType: 'website',
      },
    },
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders').then((c) => c.Orders),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Orders',
        description: 'View and manage your orders',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'orders/:id',
    loadComponent: () =>
      import('./pages/order-details/order-details').then((c) => c.OrderDetails),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Order Details',
        description: 'View order details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./pages/transactions/transactions').then((c) => c.Transactions),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Transactions',
        description: 'View your transaction history',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'bookings',
    loadComponent: () =>
      import('./pages/bookings/bookings').then((c) => c.Bookings),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Bookings',
        description: 'Manage your bookings',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'bookings/:id',
    loadComponent: () =>
      import('./pages/booking-details/booking-details').then(
        (c) => c.BookingDetails
      ),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Booking Details',
        description: 'View booking details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'transactions/:id',
    loadComponent: () =>
      import('./pages/transaction-details/transaction-details').then(
        (c) => c.TransactionDetails
      ),
    data: {
      seo: {
        title: 'Transaction Details',
        description: 'View transaction details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'payouts',
    loadComponent: () =>
      import('./pages/payouts/payouts').then((c) => c.Payouts),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Payouts',
        description: 'View and manage your payouts',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'payouts/:id',
    loadComponent: () =>
      import('./pages/payout-details/payout-details').then(
        (c) => c.PayoutDetails
      ),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Payout Details',
        description: 'View payout details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/edit-profile/edit-profile').then((c) => c.EditProfile),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Edit Profile',
        description: 'Edit your profile information',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'profile/notifications',
    loadComponent: () =>
      import('./pages/profile/profile').then((c) => c.Profile),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Profile Notifications',
        description: 'Manage your profile notifications',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings').then((c) => c.Settings),
    canActivate: [privateRouteGuard],
    data: {
      accessLevels: 'SUPERADMIN',
      seo: {
        title: 'Settings',
        description: 'Manage application settings',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'title-settings',
    loadComponent: () =>
      import('./pages/title-setting/title-setting').then((c) => c.TitleSetting),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Title Settings',
        description: 'Configure title settings',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications/notifications').then(
        (c) => c.Notifications
      ),
    canActivate: [privateRouteGuard],
    data: {
      accessLevels: 'SUPERADMIN',
      seo: {
        title: 'Notifications',
        description: 'Manage system notifications',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users').then((c) => c.Users),
    canActivate: [privateRouteGuard],
    data: {
      accessLevels: 'SUPERADMIN',
      seo: {
        title: 'Users',
        description: 'Manage system users',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./pages/user-details/user-details').then((c) => c.UserDetails),
    canActivate: [privateRouteGuard],
    data: {
      accessLevels: 'SUPERADMIN',
      seo: {
        title: 'User Details',
        description: 'View user details',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'coupon',
    loadComponent: () =>
      import('./pages/coupon/coupon').then((c) => c.CouponComponent),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Coupons',
        description: 'Manage discount coupons',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'shared-titles',
    loadComponent: () =>
      import('./pages/shared-titles/shared-titles').then((c) => c.SharedTitles),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Shared Titles',
        description: 'View shared book titles',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: 'shared-title-view/:code',
    loadComponent: () =>
      import('./pages/shared-title-view/shared-title-view').then(
        (c) => c.SharedTitleView
      ),
    data: {
      seo: {
        title: 'Book Title - My Authors Hub',
        description: 'View book details on My Authors Hub',
        keywords: ['book', 'title', 'publishing', 'authors hub'],
        ogType: 'book',
        canonicalUrl: '/shared-title-view/:code',
      },
    },
  },
  {
    path: 'shared/authors/:id',
    loadComponent: () =>
      import('./pages/shared-author-view/shared-author-view').then(
        (c) => c.SharedAuthorView
      ),
    data: {
      seo: {
        title: 'Author Profile - My Authors Hub',
        description: 'View author profile and published works',
        keywords: ['author', 'profile', 'books', 'publishing'],
        ogType: 'profile',
        canonicalUrl: '/shared/authors/:id',
      },
    },
  },
  {
    path: 'shared/publishers/:id',
    loadComponent: () =>
      import('./pages/shared-publisher-view/shared-publisher-view').then(
        (c) => c.SharedPublisherView
      ),
    data: {
      seo: {
        title: 'Publisher Profile - My Authors Hub',
        description: 'View publisher profile and published titles',
        keywords: ['publisher', 'profile', 'publishing', 'books'],
        ogType: 'profile',
        canonicalUrl: '/shared/publishers/:id',
      },
    },
  },
  {
    path: 'forgot',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then(
        (c) => c.ForgotPassword
      ),
    data: {
      seo: {
        title: 'Forgot Password - My Authors Hub',
        description: 'Reset your My Authors Hub account password',
        keywords: ['forgot password', 'reset password', 'password recovery'],
        ogType: 'website',
        canonicalUrl: '/forgot',
      },
    },
  },
  {
    path: 'forgot/verify',
    loadComponent: () =>
      import('./pages/verify-password/verify-password').then(
        (c) => c.VerifyPassword
      ),
    data: {
      seo: {
        title: 'Verify Password Reset - My Authors Hub',
        description: 'Verify your password reset code',
        keywords: ['verify password', 'password reset', 'verification'],
        ogType: 'website',
        canonicalUrl: '/forgot/verify',
      },
    },
  },
  {
    path: 'user-policies',
    loadComponent: () =>
      import('./pages/user-policies/user-policies').then((c) => c.UserPolicies),
    data: {
      seo: {
        title: 'User Policies - My Authors Hub',
        description: 'Review our user policies and guidelines for My Authors Hub',
        keywords: ['user policies', 'terms', 'guidelines', 'policies'],
        ogType: 'website',
        canonicalUrl: '/user-policies',
      },
    },
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms/terms').then((c) => c.Terms),
    data: {
      seo: {
        title: 'Terms and Conditions - My Authors Hub',
        description: 'Read our terms and conditions for using My Authors Hub',
        keywords: ['terms', 'conditions', 'legal', 'agreement'],
        ogType: 'website',
        canonicalUrl: '/terms',
      },
    },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact').then((c) => c.Contact),
    data: {
      seo: {
        title: 'Contact Us - My Authors Hub',
        description: 'Get in touch with My Authors Hub team. We are here to help you with your publishing needs.',
        keywords: ['contact', 'support', 'help', 'publishing', 'customer service'],
        ogType: 'website',
        canonicalUrl: '/contact',
      },
    },
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq').then((c) => c.FAQ),
    data: {
      seo: {
        title: 'Frequently Asked Questions - My Authors Hub',
        description: 'Find answers to common questions about My Authors Hub publishing platform',
        keywords: ['faq', 'questions', 'answers', 'help', 'support'],
        ogType: 'website',
        canonicalUrl: '/faq',
      },
    },
  },
  {
    path: 'email-verified',
    loadComponent: () =>
      import('./pages/email-verified/email-verified').then(
        (c) => c.EmailVerified
      ),
    data: {
      seo: {
        title: 'Email Verified - My Authors Hub',
        description: 'Your email has been successfully verified',
        keywords: ['email verification', 'verified', 'account'],
        ogType: 'website',
        noindex: true,
      },
    },
  },
  {
    path: 'invites',
    loadComponent: () =>
      import('./pages/invites/invites').then((c) => c.Invites),
    canActivate: [privateRouteGuard],
    data: {
      seo: {
        title: 'Invites',
        description: 'Manage user invitations',
        noindex: true,
        nofollow: true,
      },
    },
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
