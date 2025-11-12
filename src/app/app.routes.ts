import { Routes } from '@angular/router';
import { privateRouteGuard } from './guards/private-route-guard';
import { publicRouteGuard } from './guards/public-route-guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((c) => c.Dashboard),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((c) => c.Login),
    canActivate: [publicRouteGuard],
  },
  {
    path: 'publisher',
    loadComponent: () =>
      import('./pages/publisher/publisher').then((c) => c.Publisher),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'author',
    loadComponent: () =>
      import('./pages/authors/authors').then((c) => c.Authors),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'author/:id',
    loadComponent: () =>
      import('./pages/add-author/add-author').then((c) => c.AddAuthor),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'authorDetails/:id',
    loadComponent: () =>
      import('./pages/author-details/author-details').then(
        (c) => c.AuthorDetails
      ),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'author/invite/:signupCode',
    loadComponent: () =>
      import('./pages/add-author/add-author').then((c) => c.AddAuthor),
  },
  {
    path: 'title/:titleId',
    loadComponent: () =>
      import('./pages/add-title/add-title').then((c) => c.AddTitle),
    canActivate: [privateRouteGuard],
  },

  {
    path: 'titles',
    loadComponent: () => import('./pages/titles/titles').then((c) => c.Titles),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'titleDetails',
    loadComponent: () =>
      import('./pages/title-details/title-details').then((c) => c.TitleDetails),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'titleSummary/:titleId',
    loadComponent: () =>
      import('./pages/title-summary/title-summary').then((c) => c.TitleSummary),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'wallet',
    loadComponent: () => import('./pages/wallet/wallet').then((c) => c.Wallet),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'isbn',
    loadComponent: () =>
      import('./pages/isbn-list/isbn-list').then((c) => c.ISBNList),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'royalties',
    loadComponent: () =>
      import('./pages/royalties/royalties').then((c) => c.Royalties),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'publisherDetails/:id',
    loadComponent: () =>
      import('./pages/publisher-details/publisher-details').then(
        (c) => c.PublisherDetails
      ),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'publisher/:id',
    loadComponent: () =>
      import('./pages/add-publisher/add-publisher').then((C) => C.AddPublisher),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'publisher/invite/:signupCode',
    loadComponent: () =>
      import('./pages/add-publisher/add-publisher').then((C) => C.AddPublisher),
  },
  {
    path: 'bookings',
    loadComponent: () =>
      import('./pages/bookings/bookings').then((c) => c.Bookings),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'bookings/:id',
    loadComponent: () =>
      import('./pages/booking-details/booking-details').then(
        (c) => c.BookingDetails
      ),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./pages/transactions/transactions').then((c) => c.Transactions),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'transactions/:id',
    loadComponent: () =>
      import('./pages/transaction-details/transaction-details').then(
        (c) => c.TransactionDetails
      ),
  },
  {
    path: 'payouts',
    loadComponent: () =>
      import('./pages/payouts/payouts').then((c) => c.Payouts),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'payouts/:id',
    loadComponent: () =>
      import('./pages/payout-details/payout-details').then(
        (c) => c.PayoutDetails
      ),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/edit-profile/edit-profile').then((c) => c.EditProfile),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings').then((c) => c.Settings),
    canActivate: [privateRouteGuard],
    data: {
      accessLevels: 'SUPERADMIN',
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
    },
  },
  {
    path: 'coupon',
    loadComponent: () =>
      import('./pages/coupon/coupon').then((c) => c.CouponComponent),
    canActivate: [privateRouteGuard],
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
