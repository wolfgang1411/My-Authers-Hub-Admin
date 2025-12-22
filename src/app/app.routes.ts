import { Routes } from '@angular/router';
import { privateRouteGuard } from './guards/private-route-guard';
import { publicRouteGuard } from './guards/public-route-guard';
import { AddAuthor } from './pages/add-author/add-author';

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
    component: AddAuthor,
    // loadComponent: () =>
    //   import('./pages/add-author/add-author').then((c) => c.AddAuthor),
    // canActivate: [privateRouteGuard],
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
      import('./pages/title-form-temp/title-form-temp').then(
        (c) => c.TitleFormTemp
      ),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'title-update-tickets',
    loadComponent: () =>
      import('./pages/update-title-ticket/update-title-ticket').then(
        (c) => c.UpdateTitleTicket
      ),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'update-tickets',
    loadComponent: () =>
      import('./pages/update-ticket-list/update-ticket-list').then(
        (c) => c.UpdateTicketList
      ),
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
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders').then((c) => c.Orders),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'orders/:id',
    loadComponent: () =>
      import('./pages/order-details/order-details').then((c) => c.OrderDetails),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./pages/transactions/transactions').then((c) => c.Transactions),
    canActivate: [privateRouteGuard],
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
    path: 'title-settings',
    loadComponent: () =>
      import('./pages/title-setting/title-setting').then((c) => c.TitleSetting),
    canActivate: [privateRouteGuard],
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
    path: 'users',
    loadComponent: () => import('./pages/users/users').then((c) => c.Users),
    canActivate: [privateRouteGuard],
    data: {
      accessLevels: 'SUPERADMIN',
    },
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./pages/user-details/user-details').then((c) => c.UserDetails),
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
    path: 'shared-titles',
    loadComponent: () =>
      import('./pages/shared-titles/shared-titles').then((c) => c.SharedTitles),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'shared-title-view/:code',
    loadComponent: () =>
      import('./pages/shared-title-view/shared-title-view').then(
        (c) => c.SharedTitleView
      ),
  },
  {
    path: 'forgot',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then(
        (c) => c.ForgotPassword
      ),
  },
  {
    path: 'forgot/verify',
    loadComponent: () =>
      import('./pages/verify-password/verify-password').then(
        (c) => c.VerifyPassword
      ),
  },
  {
    path: 'user-policies',
    loadComponent: () =>
      import('./pages/user-policies/user-policies').then((c) => c.UserPolicies),
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms/terms').then((c) => c.Terms),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/contact/contact').then((c) => c.Contact),
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq').then((c) => c.FAQ),
  },
  {
    path: 'invites',
    loadComponent: () =>
      import('./pages/invites/invites').then((c) => c.Invites),
    canActivate: [privateRouteGuard],
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
